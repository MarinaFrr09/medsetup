"use client";

import React, { useState, useMemo } from "react";
import {
  BookX,
  Plus,
  Search,
  Folder,
  Tag,
  Crosshair,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  BarChart3,
  Flame,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Filter,
  Layers,
  HelpCircle,
  ExternalLink,
  Edit3,
  Check,
  X,
  FolderPlus,
  LayoutGrid,
  List,
  FolderArchive,
  GraduationCap,
  Sparkle,
} from "lucide-react";
import {
  useAppStore,
  CadernoErrorItem,
  CadernoErrorFolder,
  CausaErroTipo,
} from "@/stores/useAppStore";
import dynamic from "next/dynamic";
import ErrorDetailView from "@/components/caderno/ErrorDetailView";
import toast from "react-hot-toast";

const AddErrorModal = dynamic(() => import("@/components/caderno/AddErrorModal"), { ssr: false });

const CAUSA_LABELS: Record<
  CausaErroTipo,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  conceitual: {
    label: "Conceitual",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50/80 dark:bg-blue-950/40",
    border: "border-blue-200/80 dark:border-blue-900/40",
    dot: "bg-blue-500",
  },
  pegadinha: {
    label: "Pegadinha",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50/80 dark:bg-amber-950/40",
    border: "border-amber-200/80 dark:border-amber-900/40",
    dot: "bg-amber-500",
  },
  interpretacao: {
    label: "Interpretação",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50/80 dark:bg-purple-950/40",
    border: "border-purple-200/80 dark:border-purple-900/40",
    dot: "bg-purple-500",
  },
  detalhe_conduta: {
    label: "Detalhe de Conduta",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50/80 dark:bg-emerald-950/40",
    border: "border-emerald-200/80 dark:border-emerald-900/40",
    dot: "bg-emerald-500",
  },
  falta_atencao: {
    label: "Falta de Atenção",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50/80 dark:bg-rose-950/40",
    border: "border-rose-200/80 dark:border-rose-900/40",
    dot: "bg-rose-500",
  },
};

export default function CadernoErrosPage() {
  const {
    cadernoFolders,
    cadernoErrors,
    addCadernoFolder,
    deleteCadernoFolder,
    updateCadernoError,
    deleteCadernoError,
    batchAddCadernoErrors,
  } = useAppStore();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [selectedCausa, setSelectedCausa] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");

  // Toggle for analytics insight
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#6366F1");

  // Priority Session Review Modal
  const [isPrioritySessionOpen, setIsPrioritySessionOpen] = useState(false);
  const [priorityCardIndex, setPriorityCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Selected error for full modal inspection
  const [selectedErrorForDetail, setSelectedErrorForDetail] = useState<CadernoErrorItem | null>(null);

  // View Layout: "lista" (tabela compacta limpa - padrão), "cards" (cards compactos sem texto longo), "grupos" (por especialidade)
  const [viewLayout, setViewLayout] = useState<"lista" | "cards" | "grupos">("lista");

  // Collapsed state for groups view
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // 1. Calculations & Metrics
  const totalErrors = cadernoErrors.length;
  const pendentesCount = cadernoErrors.filter((e) => e.status === "pendente").length;
  const dominadosCount = cadernoErrors.filter((e) => e.status === "dominado").length;
  const dominioPercent = totalErrors > 0 ? Math.round((dominadosCount / totalErrors) * 100) : 0;

  // Primary Cause breakdown
  const causeCounts = useMemo(() => {
    const counts: Record<CausaErroTipo, number> = {
      conceitual: 0,
      pegadinha: 0,
      interpretacao: 0,
      detalhe_conduta: 0,
      falta_atencao: 0,
    };
    cadernoErrors.forEach((e) => {
      if (counts[e.causaErro] !== undefined) {
        counts[e.causaErro]++;
      }
    });
    return counts;
  }, [cadernoErrors]);

  // High priority pending errors
  const altaPriorityCount = useMemo(() => {
    return cadernoErrors.filter((e) => e.priority === "alta" && e.status !== "dominado").length;
  }, [cadernoErrors]);

  // Top Critical Specialties Breakdown
  const specialtyStats = useMemo(() => {
    const map: Record<string, { total: number; pendentes: number; dominados: number }> = {};
    cadernoErrors.forEach((e) => {
      const spec = e.especialidade || "Geral";
      if (!map[spec]) {
        map[spec] = { total: 0, pendentes: 0, dominados: 0 };
      }
      map[spec].total++;
      if (e.status === "dominado") {
        map[spec].dominados++;
      } else {
        map[spec].pendentes++;
      }
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        total: data.total,
        pendentes: data.pendentes,
        dominados: data.dominados,
        percent: totalErrors > 0 ? Math.round((data.total / totalErrors) * 100) : 0,
        dominioPct: data.total > 0 ? Math.round((data.dominados / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [cadernoErrors, totalErrors]);

  // Priority Queue for "Revisar Fila"
  const priorityQueue = useMemo(() => {
    return cadernoErrors
      .filter((e) => e.status !== "dominado")
      .sort((a, b) => {
        const pOrder = { alta: 0, media: 1, baixa: 2 };
        if (pOrder[a.priority] !== pOrder[b.priority]) {
          return pOrder[a.priority] - pOrder[b.priority];
        }
        return (a.revisoesCount || 0) - (b.revisoesCount || 0);
      });
  }, [cadernoErrors]);

  // Unique specialties for filter dropdown
  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    cadernoErrors.forEach((e) => {
      if (e.especialidade) set.add(e.especialidade);
    });
    return Array.from(set).sort();
  }, [cadernoErrors]);

  // Filtered errors list
  const filteredErrors = useMemo(() => {
    return cadernoErrors.filter((item) => {
      if (selectedFolderId !== "all" && item.folderId !== selectedFolderId) return false;
      if (selectedCausa !== "all" && item.causaErro !== selectedCausa) return false;
      if (selectedStatus === "alta_priority") {
        if (item.priority !== "alta" || item.status === "dominado") return false;
      } else if (selectedStatus !== "all" && item.status !== selectedStatus) {
        return false;
      }
      if (selectedSpecialty !== "all" && item.especialidade !== selectedSpecialty) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inSubtema = (item.subtema || "").toLowerCase().includes(q);
        const inSpecialty = (item.especialidade || "").toLowerCase().includes(q);
        const inConcept = (item.pontoCego || "").toLowerCase().includes(q);
        const inFonte = (item.referenciaFonte || item.originTitle || "").toLowerCase().includes(q);
        const inTrigger = (item.gatilhoMemoria || "").toLowerCase().includes(q);

        if (!inSubtema && !inSpecialty && !inConcept && !inFonte && !inTrigger) {
          return false;
        }
      }
      return true;
    });
  }, [cadernoErrors, selectedFolderId, selectedCausa, selectedStatus, selectedSpecialty, searchQuery]);

  // Grouped errors by specialty
  const groupedErrors = useMemo(() => {
    const groups: Record<string, CadernoErrorItem[]> = {};
    filteredErrors.forEach((item) => {
      const key = item.especialidade || "Geral";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredErrors]);

  // Handlers
  const handleToggleDominado = (item: CadernoErrorItem) => {
    const isNowDominado = item.status === "dominado";
    const nextStatus = isNowDominado ? "pendente" : "dominado";
    updateCadernoError(item.id, {
      status: nextStatus,
      revisoesCount: (item.revisoesCount || 0) + (isNowDominado ? 0 : 1),
      lastReviewedAt: new Date().toISOString(),
    });
    toast.success(
      isNowDominado ? "Marcado como Pendente para revisão" : "Conceito marcado como Dominado! 🎉"
    );
  };

  const handleDeleteCard = (id: string) => {
    deleteCadernoError(id);
    toast.success("Item removido do Caderno.");
  };

  const handleQuickCreateFlashcard = (item: CadernoErrorItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const subjectName = (item.especialidade || item.subtema || "Caderno de Erros").trim();
    const folder = useAppStore.getState().getOrCreateFolder(subjectName, "both");

    const deckId = `deck_erro_${Date.now()}`;
    const newDeck = {
      id: deckId,
      name: `${item.subtema || subjectName} (Caderno de Erros)`,
      description: `Flashcard focado no ponto cego de ${item.especialidade} - ${item.subtema}.`,
      subject: subjectName,
      folderId: folder.id,
      cardCount: 1,
      cards: [
        {
          id: `card_erro_${Date.now()}`,
          front: `[${item.especialidade} • ${item.subtema}]\n\n${item.pontoCego}`,
          back: `🎯 REGRA DE BOLSO:\n${item.gatilhoMemoria || "Revisar conceito"}\n\n⚠️ DISTRATOR:\n${item.pegadinhaDistrator || "Atenção aos distratores"}`,
        },
      ],
    };
    useAppStore.getState().addDeck(newDeck);
    toast.success(`Flashcard criado na pasta "${folder.name}"!`, { icon: "🗂️" });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: CadernoErrorFolder = {
      id: `caderno-folder-${Date.now()}`,
      name: newFolderName.trim(),
      color: newFolderColor,
      createdAt: "Hoje",
    };
    addCadernoFolder(newFolder);
    setNewFolderName("");
    setIsNewFolderModalOpen(false);
    toast.success("Pasta criada com sucesso!");
  };

  const handleLoadDemoErrors = () => {
    const demos: CadernoErrorItem[] = [
      {
        id: `demo-${Date.now()}-1`,
        especialidade: "Cardiologia",
        subtema: "Estenose Aórtica Grave Sintomática",
        pontoCego: "Não lembrar que na estenose aórtica grave sintomática a conduta primária é cirurgia ou TAVI, e vasodilatadores como IECA são arriscados.",
        pegadinhaDistrator: "Alternativa sugeria vasodilatador oral como IECA, que pode causar colapso hemodinâmico por queda abrupta de pós-carga.",
        gatilhoMemoria: "Estenose Aórtica com sintomas = INTERVIR (TAVI ou Cirurgia). Cuidado extremo com vasodilatadores!",
        referenciaFonte: "Revalida INEP",
        causaErro: "detalhe_conduta",
        status: "pendente",
        priority: "alta",
        revisoesCount: 1,
        createdAt: new Date().toISOString(),
        origin: "simulado",
        originTitle: "Simulado Nacional",
        originalQuestion: {
          text: "Paciente masculino de 74 anos, com dispneia aos moderados esforços e angina há 4 meses. Ao exame: sopro mesossistólico em foco aórtico irradiando para carótidas com pico tardio e B2 desdobrada paradoxalmente. Ecocardiograma revela área valvar de 0,7 cm² e gradiente médio de 48 mmHg. Qual a conduta indicada?",
          correctAnswer: "A",
          options: [
            { id: "A", text: "Encaminhamento para troca valvar aórtica cirúrgica ou TAVI" },
            { id: "B", text: "Iniciar Losartana 50mg/dia e reavaliar ecocardiograma em 6 meses" },
            { id: "C", text: "Tratamento conservador com diuréticos de alça e beta-bloqueador" },
            { id: "D", text: "Apenas profilaxia para endocardite infecciosa em procedimentos" },
          ],
          explanation: "Área valvar < 1,0 cm² e gradiente médio > 40 mmHg configuram estenose aórtica grave. Sintomas exigem intervenção definitiva para evitar morte súbita.",
        },
      },
      {
        id: `demo-${Date.now()}-2`,
        especialidade: "Pediatria",
        subtema: "Convulsão Febril Simples",
        pontoCego: "Indicação excessiva de punção lombar e tomografia em convulsão febril simples sem sinais meníngeos ou déficit focal.",
        pegadinhaDistrator: "O enunciado trazia febre alta (39,4°C) assustando com abalos generalizados, induzindo o candidato a suspeitar de meningite.",
        gatilhoMemoria: "Convulsão Febril Simples: 6m a 5 anos, <15 min, generalizada, 1x/24h, pós-ictal rápido. NÃO puncionar de rotina!",
        referenciaFonte: "USP Residência",
        causaErro: "pegadinha",
        status: "pendente",
        priority: "media",
        revisoesCount: 0,
        createdAt: new Date().toISOString(),
        origin: "question",
        originTitle: "Banco de Questões",
        originalQuestion: {
          text: "Menino de 2 anos apresenta crise convulsiva generalizada de 3 minutos durante pico febril de 39,4°C por otite média aguda. Após 20 minutos está ativo, reativo, fontanela plana e sem rigidez de nuca. Qual a conduta?",
          correctAnswer: "C",
          options: [
            { id: "A", text: "Realizar punção lombar diagnóstica e internar em UTI" },
            { id: "B", text: "Solicitar tomografia de crânio com urgência" },
            { id: "C", text: "Tratar a infecção de base (OMA), controle térmico e orientar a família" },
            { id: "D", text: "Iniciar fenobarbital contínuo profilático" },
          ],
          explanation: "Quadro clássico de convulsão febril simples em criança previamente hígida. Não há indicação de punção lombar ou neuroimagem.",
        },
      },
      {
        id: `demo-${Date.now()}-3`,
        especialidade: "Ginecologia e Obstetrícia",
        subtema: "Pré-Eclâmpsia com Sinais de Gravidade",
        pontoCego: "Sulfato de Magnésio é neuroprotetor materno (previne convulsões da eclâmpsia), não anti-hipertensivo primário.",
        pegadinhaDistrator: "Confundir droga de alívio pressórico imediato (Hidralazina EV / Nifedipino) com a prevenção de convulsão (Sulfato de Magnésio).",
        gatilhoMemoria: "MgSO4 = PREVINE ECLÂMPSIA. Hidralazina EV ou Nifedipino oral = CONTROLA PRESSÃO SEVERA (≥ 160x110).",
        referenciaFonte: "Enare 2024",
        causaErro: "conceitual",
        status: "dominado",
        priority: "alta",
        revisoesCount: 3,
        createdAt: new Date().toISOString(),
        origin: "simulado",
        originTitle: "Enare Simulado",
        originalQuestion: {
          text: "Gestante de 32 semanas chega com PA 170x115 mmHg, queixa de cefaleia frontal refratária e escotomas cintilantes. Qual a conduta farmacológica imediata mandatória?",
          correctAnswer: "B",
          options: [
            { id: "A", text: "Sulfato de magnésio isolado para redução rápida dos níveis tensionais" },
            { id: "B", text: "Sulfato de magnésio para profilaxia de eclâmpsia + Hidralazina venosa para controle da crise hipertensiva" },
            { id: "C", text: "Apenas sedação com benzodiazepínicos e interrupção imediata" },
            { id: "D", text: "Nitroprussiato de sódio contínuo sem necessidade de sulfatação" },
          ],
          explanation: "Na pré-eclâmpsia com sinais de gravidade, sulfato de magnésio é mandatório para prevenção de convulsões, enquanto o anti-hipertensivo venoso previne AVC hemorrágico.",
        },
      },
    ];
    batchAddCadernoErrors(demos);
    toast.success("3 erros de exemplo carregados!");
  };

  const currentPriorityCard = priorityQueue[priorityCardIndex];

  const handlePriorityAnswer = (dominated: boolean) => {
    if (!currentPriorityCard) return;

    updateCadernoError(currentPriorityCard.id, {
      status: dominated ? "dominado" : "pendente",
      revisoesCount: (currentPriorityCard.revisoesCount || 0) + 1,
      lastReviewedAt: new Date().toISOString(),
    });

    setIsCardFlipped(false);
    if (priorityCardIndex < priorityQueue.length - 1) {
      setPriorityCardIndex((prev) => prev + 1);
    } else {
      setIsPrioritySessionOpen(false);
      setPriorityCardIndex(0);
      toast.success("Sessão de revisão concluída com sucesso! 🏆");
    }
  };

  const hasActiveFilters =
    selectedFolderId !== "all" ||
    selectedCausa !== "all" ||
    selectedStatus !== "all" ||
    selectedSpecialty !== "all" ||
    searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedFolderId("all");
    setSelectedCausa("all");
    setSelectedStatus("all");
    setSelectedSpecialty("all");
  };

  if (selectedErrorForDetail) {
    return (
      <div className="w-full space-y-5 animate-fadeIn pb-16">
        <ErrorDetailView
          error={selectedErrorForDetail}
          onBack={() => setSelectedErrorForDetail(null)}
          onToggleDominado={(card) => {
            handleToggleDominado(card);
            setSelectedErrorForDetail((prev) =>
              prev && prev.id === card.id
                ? {
                    ...prev,
                    status: prev.status === "dominado" ? "pendente" : "dominado",
                    revisoesCount: (prev.revisoesCount || 0) + 1,
                  }
                : prev
            );
          }}
          onDelete={(id) => {
            handleDeleteCard(id);
            setSelectedErrorForDetail(null);
          }}
          onUpdateNotes={(id, notes) => {
            updateCadernoError(id, { userNotes: notes });
            setSelectedErrorForDetail((prev) =>
              prev && prev.id === id ? { ...prev, userNotes: notes } : prev
            );
          }}
          onUpdateAnalysis={(id, updates) => {
            updateCadernoError(id, updates);
            setSelectedErrorForDetail((prev) =>
              prev && prev.id === id ? { ...prev, ...updates } : prev
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 animate-fadeIn pb-16">
      {/* 1. Header Principal: Limpo e Elegante */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40">
              <BookX size={12} />
              <span>Engenharia Reversa</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {totalErrors} {totalErrors === 1 ? "registro" : "registros"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Caderno de Erros
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Mapeie pontos cegos e pegadinhas de provas sem poluição visual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {priorityQueue.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPriorityCardIndex(0);
                setIsCardFlipped(false);
                setIsPrioritySessionOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Iniciar fila de revisão ativa"
            >
              <Flame size={14} />
              <span>Revisar Fila ({priorityQueue.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAnalytics((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showAnalytics
                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                : "bg-white dark:bg-[#161822] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <BarChart3 size={14} className="text-purple-500" />
            <span>{showAnalytics ? "Ocultar Métricas" : "Métricas"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>Registrar Erro</span>
          </button>
        </div>
      </div>

      {/* 2. Painel de Inteligência e Estatísticas de Erros (Alta Produtividade) */}
      <div className="space-y-3.5">
        {/* Linha 1: 4 KPIs Principais Clicáveis */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Mapeado */}
          <div
            onClick={() => handleClearFilters()}
            className="p-4 rounded-2xl bg-white dark:bg-[#161822] border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Mapeado</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{totalErrors}</span>
                <span className="text-[11px] text-slate-400 font-medium">erros</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:scale-105 transition-transform">
              <BookOpen size={18} />
            </div>
          </div>

          {/* Pendentes */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "pendente" ? "all" : "pendente")}
            className={`p-4 rounded-2xl border shadow-2xs cursor-pointer transition-all flex items-center justify-between group ${
              selectedStatus === "pendente"
                ? "bg-amber-50/70 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800 ring-2 ring-amber-400/30"
                : "bg-white dark:bg-[#161822] border-slate-200/80 dark:border-slate-800/80 hover:border-amber-300"
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Pendentes</span>
                {pendentesCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{pendentesCount}</span>
                <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium">a revisar</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
              <Clock size={18} />
            </div>
          </div>

          {/* Prioridade Alta / Críticos */}
          <div
            onClick={() => {
              if (selectedStatus === "alta_priority") {
                setSelectedStatus("all");
              } else {
                setSelectedStatus("alta_priority");
              }
            }}
            className={`p-4 rounded-2xl border shadow-2xs cursor-pointer transition-all flex items-center justify-between group ${
              selectedStatus === "alta_priority"
                ? "bg-rose-50/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800 ring-2 ring-rose-400/30"
                : "bg-white dark:bg-[#161822] border-slate-200/80 dark:border-slate-800/80 hover:border-rose-300"
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Críticos</span>
                {altaPriorityCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-md bg-rose-500 text-white text-[9px] font-black">URGENTE</span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-rose-700 dark:text-rose-300">{altaPriorityCount}</span>
                <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium">alta prioridade</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100/70 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
              <Flame size={18} />
            </div>
          </div>

          {/* Dominados & Taxa */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "dominado" ? "all" : "dominado")}
            className={`p-4 rounded-2xl border shadow-2xs cursor-pointer transition-all flex flex-col justify-between group ${
              selectedStatus === "dominado"
                ? "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800 ring-2 ring-emerald-400/30"
                : "bg-white dark:bg-[#161822] border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Dominados</span>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{dominioPercent}%</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{dominadosCount}</span>
              <span className="text-[11px] text-slate-400 font-medium">de {totalErrors} fixados</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${dominioPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Linha 2: Estatísticas Aprofundadas (Raio-X de Causas & Top Matérias Críticas) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Card Raio-X de Causas (7 colunas) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#161822] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <BarChart3 size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Raio-X de Causas de Erro
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Onde está a origem dos seus erros (clique para filtrar)
                  </p>
                </div>
              </div>

              {selectedCausa !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedCausa("all")}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Ver todas
                </button>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              {(Object.keys(CAUSA_LABELS) as CausaErroTipo[]).map((cKey) => {
                const info = CAUSA_LABELS[cKey];
                const count = causeCounts[cKey] || 0;
                const pct = totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0;
                const isSelected = selectedCausa === cKey;

                return (
                  <div
                    key={cKey}
                    onClick={() => setSelectedCausa(isSelected ? "all" : cKey)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group ${
                      isSelected
                        ? "bg-slate-100 dark:bg-slate-800/90 ring-1 ring-indigo-500"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${info.dot}`} />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{info.label}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{count}</span>
                        <span className="text-[11px] text-slate-400 font-medium">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${info.dot}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card Matérias Críticas / Seus Vilões (5 colunas) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#161822] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <Crosshair size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Matérias Mais Críticas
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Onde você mais precisa reforçar
                    </p>
                  </div>
                </div>

                {selectedSpecialty !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedSpecialty("all")}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Ver todas
                  </button>
                )}
              </div>

              <div className="space-y-2.5 pt-2">
                {specialtyStats.length > 0 ? (
                  specialtyStats.slice(0, 4).map((spec) => {
                    const isSelected = selectedSpecialty === spec.name;
                    return (
                      <div
                        key={spec.name}
                        onClick={() => setSelectedSpecialty(isSelected ? "all" : spec.name)}
                        className={`p-2 rounded-xl transition-all cursor-pointer group ${
                          isSelected
                            ? "bg-slate-100 dark:bg-slate-800/90 ring-1 ring-rose-500"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                            {spec.name}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {spec.total} {spec.total === 1 ? "erro" : "erros"} ({spec.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-rose-500 transition-all duration-500"
                            style={{ width: `${spec.percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center">
                    <GraduationCap size={24} className="text-slate-300 dark:text-slate-600 mb-2" />
                    <span>Nenhum erro registrado ainda.</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">Adicione questões para mapear seus pontos fracos.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé do Card: Dica de Produtividade ou Atalho */}
            {priorityQueue.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setPriorityCardIndex(0);
                    setIsCardFlipped(false);
                    setIsPrioritySessionOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Flame size={14} />
                  <span>Iniciar Revisão Ativa ({priorityQueue.length} na fila)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Barra Unificada de Filtros, Pastas e Busca */}
      <div className="space-y-2.5">
        {/* Linha A: Filtros Rápidos de Status */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-0.5 [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => { setSelectedStatus("all"); setSelectedSpecialty("all"); setSelectedCausa("all"); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedStatus === "all" && selectedSpecialty === "all" && selectedCausa === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs ring-1 ring-slate-700/20"
                : "bg-white dark:bg-[#161822] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            Todos ({totalErrors})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus(selectedStatus === "alta_priority" ? "all" : "alta_priority")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === "alta_priority"
                ? "bg-rose-600 text-white shadow-xs font-black ring-2 ring-rose-400/40"
                : "bg-white dark:bg-[#161822] text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50"
            }`}
          >
            <Flame size={13} />
            <span>🔥 Alta Prioridade ({altaPriorityCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus(selectedStatus === "pendente" ? "all" : "pendente")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === "pendente"
                ? "bg-amber-500 text-white shadow-xs font-black ring-2 ring-amber-400/40"
                : "bg-white dark:bg-[#161822] text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50"
            }`}
          >
            <Clock size={13} />
            <span>Pendentes ({pendentesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus(selectedStatus === "dominado" ? "all" : "dominado")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === "dominado"
                ? "bg-emerald-600 text-white shadow-xs font-black ring-2 ring-emerald-400/40"
                : "bg-white dark:bg-[#161822] text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50"
            }`}
          >
            <CheckCircle2 size={13} />
            <span>Dominados ({dominadosCount})</span>
          </button>
        </div>

        {/* Linha B: Pastas */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1.5 [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => setSelectedFolderId("all")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              selectedFolderId === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-black ring-1 ring-slate-700/20"
                : "bg-white dark:bg-[#161822] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 font-semibold"
            }`}
          >
            Todas as Pastas ({totalErrors})
          </button>

          {cadernoFolders.map((f) => {
            const isSelected = selectedFolderId === f.id;
            const count = cadernoErrors.filter((e) => e.folderId === f.id).length;
            return (
              <div key={f.id} className="relative group shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs font-black ring-2 ring-indigo-400/40"
                      : "bg-white dark:bg-[#161822] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 font-semibold"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: f.color || "#6366F1" }} />
                  <span>{f.name}</span>
                  <span className="text-xs font-bold opacity-80">({count})</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCadernoFolder(f.id);
                    if (selectedFolderId === f.id) setSelectedFolderId("all");
                    toast.success("Pasta excluída.");
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition-opacity cursor-pointer"
                  title="Excluir pasta"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-100 transition-colors shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>Nova Pasta</span>
          </button>
        </div>

        {/* Linha B: Busca, Dropdowns e Visualizador */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-[#161822] p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tema, subtema ou matéria..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#10121a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Especialidade Filter */}
            {allSpecialties.length > 0 && (
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#10121a] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">Todas as Matérias</option>
                {allSpecialties.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            {/* Causa Filter */}
            <select
              value={selectedCausa}
              onChange={(e) => setSelectedCausa(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#10121a] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as Causas</option>
              {(Object.keys(CAUSA_LABELS) as CausaErroTipo[]).map((cKey) => (
                <option key={cKey} value={cKey}>
                  {CAUSA_LABELS[cKey].label} ({causeCounts[cKey] || 0})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#10121a] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="alta_priority">🔥 Alta Prioridade ({altaPriorityCount})</option>
              <option value="pendente">Pendentes ({pendentesCount})</option>
              <option value="dominado">Dominados ({dominadosCount})</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline px-1 cursor-pointer"
              >
                Limpar
              </button>
            )}

            {/* View Selector: Lista vs Cards Compactos vs Grupos */}
            <div className="flex items-center bg-slate-100 dark:bg-[#10121a] p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setViewLayout("lista")}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewLayout === "lista"
                    ? "bg-white dark:bg-[#1e2230] text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                title="Lista Tabela (Limpa)"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("cards")}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewLayout === "cards"
                    ? "bg-white dark:bg-[#1e2230] text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                title="Cards Compactos (Sem pré-visualização)"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("grupos")}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewLayout === "grupos"
                    ? "bg-white dark:bg-[#1e2230] text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                title="Agrupado por Matéria"
              >
                <FolderArchive size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Área de Conteúdo: Limpa, Sem Pré-Visualizações de Texto Longo */}
      {filteredErrors.length === 0 ? (
        <div className="py-14 text-center bg-white dark:bg-[#161822] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500">
            <BookX size={22} />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Nenhum erro encontrado
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {hasActiveFilters
                ? "Nenhum registro corresponde aos filtros selecionados."
                : "Registre erros cometidos em simulados ou questões para alimentar o caderno."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus size={13} />
              <span>Registrar Erro</span>
            </button>
            {totalErrors === 0 && (
              <button
                type="button"
                onClick={handleLoadDemoErrors}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Carregar 3 Exemplos</span>
              </button>
            )}
          </div>
        </div>
      ) : viewLayout === "lista" ? (
        /* =========================================================================
           MODO 1: LISTA TABELA (Ultra-limpa, sem poluição de cards pré-visualizados)
           ========================================================================= */
        <div className="bg-white dark:bg-[#161822] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xs">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-5">Matéria & Subtema</div>
            <div className="col-span-2">Causa do Erro</div>
            <div className="col-span-2">Origem / Prova</div>
            <div className="col-span-2 text-right">Ação</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredErrors.map((card) => {
              const isDominado = card.status === "dominado";
              const causaInfo = CAUSA_LABELS[card.causaErro] || CAUSA_LABELS.conceitual;
              const subtemaTitle = card.subtema || card.especialidade || "Erro sem título";
              const originLabel = card.referenciaFonte || card.originTitle || (card.origin === "simulado" ? "Simulado" : "Questão");

              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedErrorForDetail(card)}
                  className={`group px-4 py-3 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-3 items-start md:items-center hover:bg-slate-50/80 dark:hover:bg-[#1a1d2b] transition-colors cursor-pointer text-left ${
                    isDominado ? "opacity-80" : ""
                  }`}
                >
                  {/* Status Button (Col 1) */}
                  <div className="md:col-span-1 flex items-center justify-start md:justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDominado(card);
                      }}
                      className={`p-1 rounded-lg transition-colors cursor-pointer ${
                        isDominado
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100"
                      }`}
                      title={isDominado ? "Conceito dominado (clique para marcar pendente)" : "Pendente (clique para marcar dominado)"}
                    >
                      {isDominado ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    </button>
                  </div>

                  {/* Matéria & Subtema (Col 5) */}
                  <div className="md:col-span-5 min-w-0 w-full flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                        {card.especialidade || "Geral"}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {subtemaTitle}
                      </span>
                    </div>
                    {(card.gatilhoMemoria || card.pontoCego) && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate mt-0.5 flex items-center gap-1">
                        <Lightbulb size={11} className="shrink-0 text-amber-500" />
                        <span className="truncate">{card.gatilhoMemoria || card.pontoCego}</span>
                      </p>
                    )}
                  </div>

                  {/* Causa do Erro (Col 2) */}
                  <div className="md:col-span-2 flex items-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${causaInfo.bg} ${causaInfo.color} ${causaInfo.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${causaInfo.dot}`} />
                      <span className="truncate">{causaInfo.label}</span>
                    </span>
                  </div>

                  {/* Origem / Prova (Col 2) */}
                  <div className="md:col-span-2 flex items-center gap-2 text-xs text-slate-400 truncate">
                    <span className="truncate">{originLabel}</span>
                    {card.revisoesCount !== undefined && card.revisoesCount > 0 && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0">
                        {card.revisoesCount} rev
                      </span>
                    )}
                  </div>

                  {/* Ação (Col 2) */}
                  <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={(e) => handleQuickCreateFlashcard(card, e)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Gerar Flashcard em 1 clique"
                    >
                      <Layers size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedErrorForDetail(card);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Abrir</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCard(card.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-opacity cursor-pointer"
                      title="Excluir do caderno"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewLayout === "cards" ? (
        /* =========================================================================
           MODO 2: CARDS COMPACTOS (SEM PRÉ-VISUALIZAÇÃO DE TEXTO LONGO)
           Pequenos cards organizados, estilo fichas de estudo
           ========================================================================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredErrors.map((card) => {
            const isDominado = card.status === "dominado";
            const causaInfo = CAUSA_LABELS[card.causaErro] || CAUSA_LABELS.conceitual;
            const subtemaTitle = card.subtema || card.especialidade || "Erro sem título";

            return (
              <div
                key={card.id}
                onClick={() => setSelectedErrorForDetail(card)}
                className={`group p-4 rounded-2xl border bg-white dark:bg-[#161822] shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                  isDominado
                    ? "border-emerald-200/60 dark:border-emerald-900/40"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/60"
                }`}
              >
                <div className="space-y-2">
                  {/* Top Bar: Matéria + Causa */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate">
                      {card.especialidade || "Geral"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <span className={`w-1.5 h-1.5 rounded-full ${causaInfo.dot}`} />
                      <span className="truncate">{causaInfo.label}</span>
                    </span>
                  </div>

                  {/* Subtema / Título */}
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {subtemaTitle}
                  </h3>

                  {(card.gatilhoMemoria || card.pontoCego) && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate flex items-center gap-1">
                      <Lightbulb size={11} className="shrink-0 text-amber-500" />
                      <span className="truncate">{card.gatilhoMemoria || card.pontoCego}</span>
                    </p>
                  )}
                </div>

                {/* Footer Bar: Status + Ações */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      isDominado ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {isDominado ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    <span>{isDominado ? "Dominado" : "Pendente"}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleQuickCreateFlashcard(card, e)}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md transition-colors"
                      title="Gerar Flashcard em 1 clique"
                    >
                      <Layers size={13} />
                    </button>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      <span>Ver</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =========================================================================
           MODO 3: AGRUPADO POR MATÉRIA (Pastas / Especialidades Sanfona)
           ========================================================================= */
        <div className="space-y-3">
          {Object.entries(groupedErrors).map(([specialty, items]) => {
            const isCollapsed = collapsedGroups[specialty];
            const domCount = items.filter((e) => e.status === "dominado").length;
            const total = items.length;

            return (
              <div
                key={specialty}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161822] overflow-hidden shadow-2xs"
              >
                {/* Header da Matéria */}
                <div
                  onClick={() => toggleGroup(specialty)}
                  className="px-4 py-3 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {specialty}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      ({domCount}/{total} dominados)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      {Math.round((domCount / total) * 100)}%
                    </span>
                    {isCollapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Itens da Matéria (Tabela Limpa) */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {items.map((card) => {
                      const isDominado = card.status === "dominado";
                      const causaInfo = CAUSA_LABELS[card.causaErro] || CAUSA_LABELS.conceitual;
                      const subtemaTitle = card.subtema || "Erro sem título";

                      return (
                        <div
                          key={card.id}
                          onClick={() => setSelectedErrorForDetail(card)}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-[#1a1d2b] transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDominado(card);
                              }}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                isDominado
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                              }`}
                            >
                              {isDominado ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                            </button>

                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate block">
                                {subtemaTitle}
                              </span>
                              {(card.gatilhoMemoria || card.pontoCego) && (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate flex items-center gap-1">
                                  <Lightbulb size={10} className="shrink-0 text-amber-500" />
                                  <span className="truncate">{card.gatilhoMemoria || card.pontoCego}</span>
                                </span>
                              )}
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${causaInfo.bg} ${causaInfo.color} ${causaInfo.border} shrink-0`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${causaInfo.dot}`} />
                              <span>{causaInfo.label}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {card.referenciaFonte && (
                              <span className="text-xs text-slate-400 hidden sm:inline">
                                {card.referenciaFonte}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleQuickCreateFlashcard(card, e)}
                              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md transition-colors"
                              title="Gerar Flashcard em 1 clique"
                            >
                              <Layers size={13} />
                            </button>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <span>Abrir</span>
                              <ArrowRight size={12} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Modal de Sessão de Revisão Ativa (Fila de Prioridade) */}
      {isPrioritySessionOpen && currentPriorityCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1D27] rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-slate-200 dark:border-[#2a2d3a] shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-600 text-white">
                  <Flame size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Fila de Revisão Ativa
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Erro {priorityCardIndex + 1} de {priorityQueue.length}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPrioritySessionOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {currentPriorityCard.especialidade} • {currentPriorityCard.subtema}
                </span>
                <span className="text-[11px] font-semibold text-rose-600">
                  Causa: {CAUSA_LABELS[currentPriorityCard.causaErro]?.label}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                  <Crosshair size={12} />
                  <span>O Ponto Cego:</span>
                </span>
                <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                  {currentPriorityCard.pontoCego}
                </p>
              </div>

              {isCardFlipped ? (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <Lightbulb size={13} />
                      <span>Gatilho de Memória (Regra de Bolso):</span>
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-100 leading-snug">
                      {currentPriorityCard.gatilhoMemoria}
                    </p>
                  </div>

                  {currentPriorityCard.pegadinhaDistrator && (
                    <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                      <span className="font-bold block mb-0.5">Mecanismo do Distrator:</span>
                      {currentPriorityCard.pegadinhaDistrator}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <button
                    type="button"
                    onClick={() => setIsCardFlipped(true)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
                  >
                    <Lightbulb size={14} />
                    <span>Revelar Regra de Bolso</span>
                  </button>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Tente lembrar da conduta ou conceito mentalmente antes de revelar.
                  </p>
                </div>
              )}
            </div>

            {isCardFlipped && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => handlePriorityAnswer(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 cursor-pointer"
                >
                  Manter Pendente
                </button>
                <button
                  type="button"
                  onClick={() => handlePriorityAnswer(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Dominado! 🎉
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Modal Criar Pasta */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1D27] rounded-3xl p-5 max-w-sm w-full border border-slate-200 dark:border-[#2a2d3a] shadow-xl relative space-y-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Folder size={16} className="text-indigo-500" />
              <span>Criar Nova Pasta</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                  Nome da Pasta:
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ex: Cardiologia"
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-[#2a2d3a] bg-slate-50 dark:bg-[#0F1117] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                  Cor da Pasta:
                </label>
                <div className="flex items-center gap-2">
                  {["#6366F1", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#EF4444"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewFolderColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        newFolderColor === c ? "scale-125 border-black dark:border-white" : "border-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Criar Pasta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Adicionar Erro */}
      <AddErrorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        questions={[
          {
            text: "",
            correctAnswer: "",
            origin: "manual",
            originTitle: "Registro Manual",
          },
        ]}
      />


    </div>
  );
}
