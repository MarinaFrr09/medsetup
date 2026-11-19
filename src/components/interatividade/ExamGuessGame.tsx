"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Sparkles,
  Check,
  X,
  HelpCircle,
  Upload,
  Shuffle,
  Calendar,
  FileText,
  Layers,
  ClipboardCheck,
  Network,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ExternalLink,
  Lightbulb,
  ShieldAlert,
  Activity,
  BookOpen,
  Loader2,
  Trash2,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import {
  BUILTIN_PROGRESSIVE_EXAMS,
  MEDICAL_EXAMS_CATALOG,
  ProgressiveExamCase,
  getDailyExamCase,
  isExamMatch,
} from "@/data/examCasesBank";
import {
  getTodayKey,
  normalizeDiagnosisString,
} from "@/data/clinicalCasesBank";
import { useAppStore } from "@/stores/useAppStore";
import toast from "react-hot-toast";

interface ExamAttempt {
  guess: string;
  isCorrect: boolean;
}

interface SavedExamProgress {
  caseId: string;
  dateKey: string;
  attempts: ExamAttempt[];
  revealedCluesCount: number;
  status: "playing" | "won" | "lost";
  completedAt?: string;
}

const DAILY_EXAM_PROGRESS_KEY = "medsetup_daily_exam_progress_v1";
const SAVED_EXAMS_STORAGE_KEY = "medsetup_user_saved_exam_cases_v1";

const EXAM_CATEGORIES = [
  "Aleatória (Todos os Tipos de Exames)",
  "Imagem e Radiologia (TC, RM, Angio-TC, Raio-X)",
  "Ultrassonografia e Doppler",
  "Cardiologia e Exames Funcionais",
  "Laboratório, Líquor e Biomarcadores",
  "Endoscopia e Procedimentos Invasivos",
  "Biópsias e Anatomopatológico",
  "Ginecologia, Obstetrícia e Pediatria",
  "Pneumologia e Provas Funcionais",
];

const DIFFICULTY_OPTIONS = [
  "Aleatório (Fácil a Difícil)",
  "Fácil",
  "Médio",
  "Difícil",
];

export function ExamGuessGame() {
  const router = useRouter();
  const {
    addDeck,
    addQuestions,
    addMindMap,
    getOrCreateFolder,
    documentTranscriptions,
    tutoriaAnalyses,
    atelieAnalyses,
  } = useAppStore();

  const [activeExam, setActiveExam] = useState<ProgressiveExamCase>(() =>
    getDailyExamCase()
  );
  const [savedExams, setSavedExams] = useState<ProgressiveExamCase[]>([]);
  const [savedPanelOpen, setSavedPanelOpen] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [revealedCluesCount, setRevealedCluesCount] = useState<number>(1);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Combobox state
  const [query, setQuery] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // AI / PDF generator controls
  const [generatorPanelOpen, setGeneratorPanelOpen] = useState<boolean>(false);
  const [generatorMode, setGeneratorMode] = useState<"random" | "pdf">("random");
  const [selectedArea, setSelectedArea] = useState<string>(EXAM_CATEGORIES[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(
    DIFFICULTY_OPTIONS[0]
  );
  const [customTopic, setCustomTopic] = useState<string>("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [selectedStoredDocId, setSelectedStoredDocId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Post-case AI Study Generators
  const [generatingStudyType, setGeneratingStudyType] = useState<
    "flashcards" | "questions" | "mindmap" | null
  >(null);
  const [generatedFlashcards, setGeneratedFlashcards] = useState<
    Array<{ front: string; back: string }>
  >([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [generatedMindMapId, setGeneratedMindMapId] = useState<string | null>(
    null
  );

  // Load user-saved exams and today's daily exam (purging old days' progress)
  useEffect(() => {
    try {
      const rawSaved = localStorage.getItem(SAVED_EXAMS_STORAGE_KEY);
      if (rawSaved) {
        setSavedExams(JSON.parse(rawSaved));
      }
    } catch {}

    try {
      const todayKey = getTodayKey();
      const rawProg = localStorage.getItem(DAILY_EXAM_PROGRESS_KEY);
      if (rawProg) {
        const parsed: Record<string, SavedExamProgress> = JSON.parse(rawProg);
        const todayOnly: Record<string, SavedExamProgress> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (v?.dateKey === todayKey) {
            todayOnly[k] = v;
          }
        }
        localStorage.setItem(DAILY_EXAM_PROGRESS_KEY, JSON.stringify(todayOnly));
      }
    } catch {}

    const daily = getDailyExamCase();
    loadExam(daily, true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isCurrentExamSaved = useMemo(
    () => savedExams.some((e) => e.id === activeExam.id),
    [savedExams, activeExam.id]
  );

  const handleToggleSaveExam = () => {
    if (isCurrentExamSaved) {
      const updated = savedExams.filter((e) => e.id !== activeExam.id);
      setSavedExams(updated);
      try {
        localStorage.setItem(SAVED_EXAMS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      toast.success("Exame removido dos salvos.");
    } else {
      const updated = [activeExam, ...savedExams];
      setSavedExams(updated);
      try {
        localStorage.setItem(SAVED_EXAMS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      toast.success("Desafio de exame salvo nos seus favoritos!");
    }
  };

  const handleDeleteSavedExam = (id: string) => {
    const updated = savedExams.filter((e) => e.id !== id);
    setSavedExams(updated);
    try {
      localStorage.setItem(SAVED_EXAMS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    toast.success("Exame removido dos salvos.");
  };

  const saveExamProgress = (
    targetExam: ProgressiveExamCase,
    nextAttempts: ExamAttempt[],
    nextCluesCount: number,
    nextStatus: "playing" | "won" | "lost"
  ) => {
    if (!targetExam.id.startsWith("daily-exam-")) return;
    try {
      const todayKey = getTodayKey();
      const map: Record<string, SavedExamProgress> = {
        [targetExam.id]: {
          caseId: targetExam.id,
          dateKey: todayKey,
          attempts: nextAttempts,
          revealedCluesCount: nextCluesCount,
          status: nextStatus,
          completedAt:
            nextStatus !== "playing" ? new Date().toISOString() : undefined,
        },
      };
      localStorage.setItem(DAILY_EXAM_PROGRESS_KEY, JSON.stringify(map));
    } catch {}
  };

  const loadExam = (targetExam: ProgressiveExamCase, restoreSaved = false) => {
    setActiveExam(targetExam);
    setQuery("");
    setDropdownOpen(false);
    setGeneratedFlashcards([]);
    setGeneratedQuestions([]);
    setGeneratedMindMapId(null);

    if (restoreSaved) {
      try {
        const raw = localStorage.getItem(DAILY_EXAM_PROGRESS_KEY);
        const map: Record<string, SavedExamProgress> = raw ? JSON.parse(raw) : {};
        const saved = map[targetExam.id];
        if (saved && (saved.attempts.length > 0 || saved.status !== "playing")) {
          setAttempts(saved.attempts);
          setRevealedCluesCount(saved.revealedCluesCount);
          setStatus(saved.status);
          setShowExplanation(saved.status !== "playing");
          return;
        }
      } catch {}
    }

    setAttempts([]);
    setRevealedCluesCount(1);
    setStatus("playing");
    setShowExplanation(false);
  };

  const resetCurrentExam = () => {
    try {
      const raw = localStorage.getItem(DAILY_EXAM_PROGRESS_KEY);
      const map: Record<string, SavedExamProgress> = raw ? JSON.parse(raw) : {};
      delete map[activeExam.id];
      localStorage.setItem(DAILY_EXAM_PROGRESS_KEY, JSON.stringify(map));
    } catch {}
    setAttempts([]);
    setRevealedCluesCount(1);
    setStatus("playing");
    setShowExplanation(false);
    setQuery("");
  };

  const availableExams = useMemo(() => {
    const extra: string[] = [
      activeExam.examName,
      ...(activeExam.debriefing?.differentials?.map((d) => d.name) || []),
      ...((activeExam as any).suggestedDistractors || []),
    ].filter(Boolean);

    return Array.from(new Set([...MEDICAL_EXAMS_CATALOG, ...extra])).sort(
      (a, b) => a.localeCompare(b, "pt-BR")
    );
  }, [activeExam]);

  const filteredExams = useMemo(() => {
    const alreadyGuessed = new Set(
      attempts.map((a) => normalizeDiagnosisString(a.guess))
    );
    const normQ = normalizeDiagnosisString(query);

    return availableExams
      .filter((item) => !alreadyGuessed.has(normalizeDiagnosisString(item)))
      .filter((item) => {
        if (!normQ) return true;
        return normalizeDiagnosisString(item).includes(normQ);
      })
      .slice(0, 60);
  }, [availableExams, query, attempts]);

  const remainingAttempts = Math.max(0, 5 - attempts.length);

  const handleGuessSubmit = (selectedExam?: string) => {
    if (status !== "playing") return;
    const rawGuess = (selectedExam ?? query).trim();
    if (!rawGuess) {
      toast.error("Selecione ou digite um exame para tentar.");
      return;
    }

    const normGuess = normalizeDiagnosisString(rawGuess);
    if (
      attempts.some((a) => normalizeDiagnosisString(a.guess) === normGuess)
    ) {
      toast.error("Você já tentou esse exame neste desafio.");
      return;
    }

    const correct = isExamMatch(rawGuess, activeExam);
    const nextAttempts: ExamAttempt[] = [
      ...attempts,
      {
        guess: correct ? activeExam.examName : rawGuess,
        isCorrect: correct,
      },
    ];

    setQuery("");
    setDropdownOpen(false);

    if (correct) {
      setAttempts(nextAttempts);
      setRevealedCluesCount(5);
      setStatus("won");
      setShowExplanation(true);
      saveExamProgress(activeExam, nextAttempts, 5, "won");
      toast.success(
        `Parabéns! Você acertou (${activeExam.examName}) na ${nextAttempts.length}ª tentativa!`
      );
      return;
    }

    if (nextAttempts.length >= 5) {
      setAttempts(nextAttempts);
      setRevealedCluesCount(5);
      setStatus("lost");
      setShowExplanation(true);
      saveExamProgress(activeExam, nextAttempts, 5, "lost");
    } else {
      const nextClues = Math.min(5, nextAttempts.length + 1);
      setAttempts(nextAttempts);
      setRevealedCluesCount(nextClues);
      setStatus("playing");
      saveExamProgress(activeExam, nextAttempts, nextClues, "playing");
    }
  };

  const handlePickRandomExam = () => {
    const pool = BUILTIN_PROGRESSIVE_EXAMS.filter(
      (e) => e.examName !== activeExam.examName
    );
    const picked =
      pool[Math.floor(Math.random() * pool.length)] ||
      BUILTIN_PROGRESSIVE_EXAMS[0];
    loadExam(
      {
        ...picked,
        id: `rand_exam_${Date.now()}`,
        date: new Date().toLocaleDateString("pt-BR"),
      },
      false
    );
    toast.success("Novo desafio de exame carregado!");
  };

  const handleGenerateAIExam = async () => {
    if (
      generatorMode === "pdf" &&
      attachedFiles.length === 0 &&
      !selectedStoredDocId
    ) {
      toast.error(
        "Anexe pelo menos um arquivo PDF ou selecione um material salvo para gerar o desafio."
      );
      return;
    }

    setIsGenerating(true);
    try {
      let storedContext = "";
      let sourceLabel = "";

      if (generatorMode === "pdf" && selectedStoredDocId) {
        const doc = documentTranscriptions.find(
          (d) => d.id === selectedStoredDocId
        );
        const tut = tutoriaAnalyses.find((t) => t.id === selectedStoredDocId);
        const ate = atelieAnalyses.find((a) => a.id === selectedStoredDocId);

        if (doc) {
          storedContext = `DOCUMENTO: ${doc.title}\n${doc.summary || ""}\n${
            doc.content || ""
          }`;
          sourceLabel = `PDF: ${doc.title}`;
        } else if (tut) {
          storedContext = `TUTORIA: ${tut.title}\n${
            tut.result?.markdownContent || ""
          }`;
          sourceLabel = `Tutoria: ${tut.title}`;
        } else if (ate) {
          storedContext = `ROTEIRO: ${ate.title}\n${
            ate.customMarkdown || JSON.stringify(ate.result || {})
          }`;
          sourceLabel = `Ateliê: ${ate.title}`;
        }
      }

      const avoidList = [
        activeExam.examName,
        ...savedExams.slice(0, 8).map((e) => e.examName),
      ];

      let res: Response;
      if (generatorMode === "pdf" && attachedFiles.length > 0) {
        const formData = new FormData();
        formData.append("mode", "exam");
        formData.append("specialty", selectedArea);
        formData.append("difficulty", selectedDifficulty);
        if (customTopic.trim()) formData.append("topic", customTopic.trim());
        if (storedContext) formData.append("materialContext", storedContext);
        formData.append("avoidDiagnoses", JSON.stringify(avoidList));
        for (const f of attachedFiles) {
          formData.append("files", f);
        }
        sourceLabel = `PDF: ${attachedFiles.map((f) => f.name).join(", ")}`;

        res = await fetch("/api/ai/generate-interactive-case", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/ai/generate-interactive-case", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "exam",
            specialty: selectedArea,
            difficulty: selectedDifficulty,
            topic: customTopic.trim(),
            materialContext: storedContext,
            avoidDiagnoses: avoidList,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao gerar desafio de exame com IA.");
      }

      const newExam: ProgressiveExamCase = {
        id: data.id || `pexam_${Date.now()}`,
        date: data.date || new Date().toLocaleDateString("pt-BR"),
        examName: data.examName,
        acceptedSynonyms: data.acceptedSynonyms || [],
        examCategory: data.examCategory || selectedArea,
        difficulty: data.difficulty || "Médio",
        sourceLabel: sourceLabel || undefined,
        clues: data.clues,
        debriefing: data.debriefing,
      };

      loadExam(newExam, false);
      setGeneratorPanelOpen(false);
      toast.success("Novo desafio de exame gerado com IA!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar desafio com IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const buildExamContextForAI = () => {
    return `EXAME COMPLEMENTAR: ${activeExam.examName}
Categoria: ${activeExam.examCategory} | Nível: ${activeExam.difficulty}

1. CENÁRIO CLÍNICO:
${activeExam.clues[0]}

2. PISTA 2/5:
${activeExam.clues[1]}

3. PISTA 3/5:
${activeExam.clues[2]}

4. PISTA 4/5:
${activeExam.clues[3]}

5. PISTA 5/5:
${activeExam.clues[4]}

DEBRIEFING DIAGNÓSTICO:
${activeExam.debriefing.overview}

EXAMES CONCORRENTES / DIFERENCIAIS:
${activeExam.debriefing.differentials
  .map((d) => `- ${d.name}: ${d.distinction}`)
  .join("\n")}

INDICAÇÕES, INTERPRETAÇÃO E CONTRAINDICAÇÕES:
${activeExam.debriefing.indicationsAndInterpretation}

PÉROLAS DIAGNÓSTICAS:
${activeExam.debriefing.pearls.join("\n")}`;
  };

  const handleGenerateFlashcards = async () => {
    setGeneratingStudyType("flashcards");
    try {
      const res = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `${activeExam.examName} (${activeExam.examCategory})\n\n${buildExamContextForAI()}`,
          count: 8,
          difficulty: "hard",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao gerar flashcards.");
      }

      const cards = Array.isArray(data.flashcards) ? data.flashcards : [];
      if (cards.length === 0) throw new Error("Nenhum flashcard retornado.");

      const folder = getOrCreateFolder("Exames Diagnósticos", "flashcards");
      addDeck({
        id: `deck_exam_${Date.now()}`,
        name: `Exame: ${activeExam.examName}`,
        description: `Flashcards sobre ${activeExam.examName} (${activeExam.examCategory})`,
        subject: activeExam.examCategory,
        folderId: folder.id,
        cardCount: cards.length,
        progress: 0,
        cards: cards.map((c: any, idx: number) => ({
          id: `fc_exam_${Date.now()}_${idx}`,
          front: c.front,
          back: c.back,
        })),
        difficulty: activeExam.difficulty,
      });

      setGeneratedFlashcards(cards);
      toast.success(`${cards.length} flashcards salvos na aba Flashcards!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar flashcards.");
    } finally {
      setGeneratingStudyType(null);
    }
  };

  const handleGenerateQuestions = async () => {
    setGeneratingStudyType("questions");
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `${activeExam.examName} — ${activeExam.examCategory}`,
          content: buildExamContextForAI(),
          count: 5,
          difficulty: "hard",
          type: "multiple_choice",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao gerar questões.");
      }

      const rawQ = Array.isArray(data.questions) ? data.questions : [];
      if (rawQ.length === 0) throw new Error("Nenhuma questão retornada.");

      const folder = getOrCreateFolder("Exames Diagnósticos", "questions");
      const formatted = rawQ.map((q: any, idx: number) => ({
        id: `q_exam_${Date.now()}_${idx}`,
        text: q.text,
        type: "multiple_choice",
        difficulty: activeExam.difficulty,
        subject: activeExam.examCategory,
        folderId: folder.id,
        options: q.options || [],
        answer: q.answer || "a",
        explanation: q.explanation || "",
        date: new Date().toLocaleDateString("pt-BR"),
        status: "unanswered" as const,
      }));

      addQuestions(formatted);
      setGeneratedQuestions(formatted);
      toast.success(`${formatted.length} questões salvas no Banco de Questões!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar questões.");
    } finally {
      setGeneratingStudyType(null);
    }
  };

  const handleGenerateMindMap = async () => {
    setGeneratingStudyType("mindmap");
    try {
      const res = await fetch("/api/ai/generate-mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `${activeExam.examName} (Indicações, Achados Clássicos, Interpretação e Contraindicações)\n\n${buildExamContextForAI()}`,
          layout: "4d-free",
          detailLevel: "detailed",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao gerar mapa mental.");
      }

      const folder = getOrCreateFolder("Exames Diagnósticos", "mindmaps");
      const mapId = `mm_exam_${Date.now()}`;
      addMindMap({
        id: mapId,
        name: `Exame: ${activeExam.examName}`,
        description: `Mapa mental diagnóstico sobre ${activeExam.examName} (${activeExam.examCategory})`,
        layout: "4d-free",
        folderId: folder.id,
        date: new Date().toLocaleDateString("pt-BR"),
        nodes: data.nodes || [],
        edges: data.edges || [],
      });

      setGeneratedMindMapId(mapId);
      toast.success("Mapa Mental gerado e salvo em Mapas Mentais!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar mapa mental.");
    } finally {
      setGeneratingStudyType(null);
    }
  };

  const clueTitles = [
    "Cenário clínico",
    "Pista 2/5",
    "Pista 3/5",
    "Pista 4/5",
    "Pista 5/5",
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/90 p-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Adivinhar Exame
            </h2>
            <p className="text-xs text-muted-foreground">
              Descubra qual exame complementar pedir com base no cenário clínico e nos achados
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const daily = getDailyExamCase();
              loadExam(daily, true);
              toast.success("Exame do Dia carregado!");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Exame do Dia
          </button>

          <button
            type="button"
            onClick={handlePickRandomExam}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/70 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Próximo Aleatório
          </button>

          {savedExams.length > 0 && (
            <button
              type="button"
              onClick={() => setSavedPanelOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              <BookmarkCheck className="h-3.5 w-3.5" />
              Salvos ({savedExams.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setGeneratorPanelOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Gerar com IA / Anexar PDF
            {generatorPanelOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Saved Exams Drawer */}
      {savedPanelOpen && savedExams.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-card p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <BookmarkCheck className="h-4 w-4" />
              Exames Salvos por Você ({savedExams.length})
            </h3>
            <button
              type="button"
              onClick={() => setSavedPanelOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Fechar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {savedExams.map((se) => (
              <div
                key={se.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/80 p-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    loadExam(se, false);
                    setSavedPanelOpen(false);
                  }}
                  className="text-left flex-1 min-w-0"
                >
                  <div className="text-xs font-bold text-foreground truncate">
                    Desafio de Exame — {se.date}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {se.clues[0]}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSavedExam(se.id)}
                  title="Remover dos salvos"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Panel: Generate Random Exam with AI or From Attached PDF */}
      {generatorPanelOpen && (
        <div className="rounded-2xl border border-emerald-500/30 bg-card p-5 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Gerar Novo Desafio de Exame com IA
              </h3>
              <p className="text-xs text-muted-foreground">
                Sorteie qualquer exame complementar da medicina ou anexe seus PDFs
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => setGeneratorMode("random")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  generatorMode === "random"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Aleatório (Todos os Exames)
              </button>
              <button
                type="button"
                onClick={() => setGeneratorMode("pdf")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  generatorMode === "pdf"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Com Base em PDF Anexado
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Categoria do Exame
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {EXAM_CATEGORIES.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Nível de Dificuldade
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {DIFFICULTY_OPTIONS.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Foco opcional (deixe em branco p/ surpresa)
              </label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Ex: Neuroimagem, Autoanticorpos..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>

          {generatorMode === "pdf" && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 text-center cursor-pointer hover:bg-emerald-500/10 transition-colors">
                  <Upload className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-1.5" />
                  <span className="text-xs font-semibold text-foreground">
                    Clique para anexar PDF(s), Word ou Slides
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    A IA escolherá um exame diagnóstico chave do seu arquivo
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        setAttachedFiles((prev) => [...prev, ...files]);
                      }
                    }}
                  />
                </label>

                <div className="rounded-xl border border-border bg-background/60 p-3.5 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Ou selecione um PDF / Roteiro já salvo no MedSetup
                    </label>
                    <select
                      value={selectedStoredDocId}
                      onChange={(e) => setSelectedStoredDocId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground"
                    >
                      <option value="">-- Nenhum material salvo selecionado --</option>
                      {documentTranscriptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          [PDF Transcrito] {d.title}
                        </option>
                      ))}
                      {tutoriaAnalyses.map((t) => (
                        <option key={t.id} value={t.id}>
                          [Tutoria] {t.title}
                        </option>
                      ))}
                      {atelieAnalyses.map((a) => (
                        <option key={a.id} value={a.id}>
                          [Ateliê/SP] {a.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {attachedFiles.map((file, idx) => (
                    <span
                      key={`${file.name}-${idx}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {file.name}
                      <button
                        type="button"
                        onClick={() =>
                          setAttachedFiles((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setGeneratorPanelOpen(false)}
              className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateAIExam}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando Desafio e Debriefing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {generatorMode === "pdf"
                    ? "Gerar Exame a partir do PDF"
                    : "Sortear e Gerar Exame com IA"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MAIN EXAM CHALLENGE CARD */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-slate-900/95 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {activeExam.id.startsWith("daily-exam-")
                ? "Exame do dia"
                : "Desafio de exame"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-sm text-slate-400 dark:text-slate-400">
                {activeExam.date}
              </span>
              {activeExam.sourceLabel && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  <FileText className="h-3 w-3" />
                  {activeExam.sourceLabel}
                </span>
              )}
              {status !== "playing" && (
                <>
                  <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {activeExam.examCategory}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                      activeExam.difficulty === "Fácil"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : activeExam.difficulty === "Médio"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    Nível: {activeExam.difficulty}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSaveExam}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isCurrentExamSaved
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {isCurrentExamSaved ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  Exame salvo
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5" />
                  Salvar exame
                </>
              )}
            </button>

            {(attempts.length > 0 || status !== "playing") && (
              <button
                type="button"
                onClick={resetCurrentExam}
                title="Reiniciar este desafio"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar
              </button>
            )}
          </div>
        </div>

        {/* Progressive Clue Cards */}
        <div className="space-y-4">
          {activeExam.clues.slice(0, revealedCluesCount).map((clueText, idx) => (
            <div
              key={`${activeExam.id}-clue-${idx}`}
              className="rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200"
            >
              <div className="text-[13px] font-bold text-[#00a859] dark:text-emerald-400 mb-1.5">
                {clueTitles[idx] || `Pista ${idx + 1}/5`}
              </div>
              <p className="text-[16px] sm:text-[17px] leading-relaxed text-slate-800 dark:text-slate-100 font-normal">
                {clueText}
              </p>
            </div>
          ))}
        </div>

        {/* Playing Controls */}
        {status === "playing" && (
          <div className="space-y-4 pt-1">
            <div>
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((barIdx) => {
                  const isRemaining = barIdx < remainingAttempts;
                  return (
                    <div
                      key={barIdx}
                      className={`h-2 rounded-full transition-colors duration-300 ${
                        isRemaining
                          ? "bg-[#12b76a]"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[13px] text-slate-400 dark:text-slate-400 mt-1.5">
                {remainingAttempts === 1
                  ? "1 tentativa restante"
                  : `${remainingAttempts} tentativas restantes`}
              </p>
            </div>

            {attempts.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  TENTATIVAS
                </div>
                <div className="space-y-2">
                  {attempts.map((att, idx) => (
                    <div
                      key={`${att.guess}-${idx}`}
                      className="flex items-center gap-3 rounded-xl border border-[#f87171] bg-[#fef2f2] dark:bg-red-950/30 dark:border-red-500/50 px-4 py-3 text-[15px] font-medium text-[#b91c1c] dark:text-red-300"
                    >
                      <X className="h-4 w-4 text-[#ef4444] shrink-0 stroke-[2.5]" />
                      <span>{att.guess}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <div ref={comboboxRef} className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setDropdownOpen(true);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setDropdownOpen(true);
                      setHighlightedIndex((prev) =>
                        Math.min(prev + 1, Math.max(0, filteredExams.length - 1))
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex((prev) => Math.max(0, prev - 1));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (
                        dropdownOpen &&
                        filteredExams.length > 0 &&
                        query.trim().length > 0
                      ) {
                        const chosen = filteredExams[highlightedIndex] || query;
                        setQuery(chosen);
                        setDropdownOpen(false);
                        handleGuessSubmit(chosen);
                      } else if (query.trim()) {
                        handleGuessSubmit(query);
                      }
                    } else if (e.key === "Escape") {
                      setDropdownOpen(false);
                    }
                  }}
                  placeholder="Selecione um exame..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-4 py-3.5 text-[16px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#12b76a] focus:outline-none focus:ring-2 focus:ring-[#12b76a]/20"
                />

                {dropdownOpen && filteredExams.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 shadow-xl">
                    {filteredExams.map((exam, idx) => (
                      <button
                        key={exam}
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => {
                          setQuery(exam);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                          idx === highlightedIndex
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                        }`}
                      >
                        <span>{exam}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleGuessSubmit()}
                disabled={!query.trim()}
                className="rounded-xl bg-[#12b76a] hover:bg-[#0e9f5c] disabled:bg-[#8fbda5] dark:disabled:bg-emerald-800/50 px-7 py-3.5 text-[16px] font-bold text-white transition-colors shrink-0 shadow-sm"
              >
                Tentar
              </button>

              <button
                type="button"
                onClick={() => {
                  setRevealedCluesCount(5);
                  setStatus("lost");
                  setShowExplanation(true);
                  setDropdownOpen(false);
                  saveExamProgress(activeExam, attempts, 5, "lost");
                }}
                className="rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 px-5 py-3.5 text-[15px] font-semibold text-red-600 dark:text-red-300 transition-colors shrink-0"
              >
                Desistir
              </button>
            </div>
          </div>
        )}

        {/* End-of-Challenge Summary Card */}
        {status !== "playing" && (
          <div
            className={`rounded-2xl border p-6 space-y-5 transition-all ${
              status === "won"
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20"
                : "border-[#fee2e2] bg-[#fff5f5] dark:border-red-500/30 dark:bg-red-950/20"
            }`}
          >
            <div>
              <h2
                className={`text-xl sm:text-2xl font-bold ${
                  status === "won"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-[#dc2626] dark:text-red-400"
                }`}
              >
                {activeExam.examName}
              </h2>
              <p
                className={`text-sm font-medium mt-0.5 ${
                  status === "won"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-[#ef4444] dark:text-red-300"
                }`}
              >
                {status === "won"
                  ? `Acertou na ${attempts.length}ª tentativa!`
                  : attempts.length < 5
                  ? "Desistiu — resposta e debriefing liberados"
                  : "Não acertou"}
              </p>
            </div>

            <div
              className={`border-t ${
                status === "won"
                  ? "border-emerald-200/80 dark:border-emerald-500/20"
                  : "border-red-200/70 dark:border-red-500/20"
              }`}
            />

            <div className="space-y-2.5">
              <div
                className={`text-xs font-bold uppercase tracking-wider ${
                  status === "won"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-[#dc2626] dark:text-red-400"
                }`}
              >
                SUAS HIPÓTESES ({attempts.length}/5)
              </div>

              <div className="space-y-2">
                {attempts.map((att, idx) => (
                  <div
                    key={`final-exam-${att.guess}-${idx}`}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-[15px] font-medium ${
                      att.isCorrect
                        ? "border-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/50 dark:border-emerald-500/60 text-emerald-800 dark:text-emerald-200"
                        : "border-[#f87171] bg-[#fee2e2]/70 dark:bg-red-950/35 dark:border-red-500/50 text-[#b91c1c] dark:text-red-300"
                    }`}
                  >
                    {att.isCorrect ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                    ) : (
                      <X className="h-4 w-4 text-[#ef4444] shrink-0 stroke-[2.5]" />
                    )}
                    <span>{att.guess}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExplanation((prev) => !prev)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-[#eff6ff] dark:bg-blue-950/40 py-3.5 px-4 text-[15px] font-bold text-[#1d4ed8] dark:text-blue-300 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              {showExplanation ? "Ocultar explicação" : "Ver explicação"}
            </button>
          </div>
        )}

        {/* Detailed Diagnostic Debriefing */}
        {status !== "playing" && showExplanation && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-6 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Debriefing Diagnóstico Detalhado
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {activeExam.examName} — Propedêutica e Indicação
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-slate-200/80 dark:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {activeExam.examCategory}
                </span>
                <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {activeExam.difficulty}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                1. Papel Diagnóstico e Visão Geral
              </h4>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">
                {activeExam.debriefing.overview}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                2. Interpretação de Cada Pista
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {activeExam.debriefing.clueBreakdown.map((exp, idx) => (
                  <div
                    key={`exam-debrief-clue-${idx}`}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/90 p-3.5"
                  >
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      {clueTitles[idx]}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {exp}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {activeExam.debriefing.differentials?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  3. Exames Concorrentes e Quando Pedir Cada Um
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeExam.debriefing.differentials.map((diff, idx) => (
                    <div
                      key={`exam-diff-${idx}`}
                      className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5"
                    >
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        {diff.name}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {diff.distinction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                4. Indicações, Interpretação e Contraindicações
              </h4>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                {activeExam.debriefing.indicationsAndInterpretation}
              </div>
            </div>

            {activeExam.debriefing.pearls?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  5. Pérolas Diagnósticas de Alto Rendimento
                </h4>
                <ul className="space-y-1.5">
                  {activeExam.debriefing.pearls.map((pearl, idx) => (
                    <li
                      key={`exam-pearl-${idx}`}
                      className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200"
                    >
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{pearl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Study Tools: Flashcards, Questões e Mapa Mental */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Transformar este Exame em Material de Estudo com IA
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gere flashcards, questões comentadas ou um mapa mental diretamente sobre{" "}
                  <strong>{activeExam.examName}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={generatingStudyType !== null}
                  onClick={handleGenerateFlashcards}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-3 text-xs font-bold text-emerald-800 dark:text-emerald-200 transition-colors disabled:opacity-60"
                >
                  {generatingStudyType === "flashcards" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando Flashcards...
                    </>
                  ) : (
                    <>
                      <Layers className="h-4 w-4" />
                      Gerar Flashcards com IA
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={generatingStudyType !== null}
                  onClick={handleGenerateQuestions}
                  className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-3 text-xs font-bold text-blue-800 dark:text-blue-200 transition-colors disabled:opacity-60"
                >
                  {generatingStudyType === "questions" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando Questões...
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="h-4 w-4" />
                      Gerar Questões com IA
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={generatingStudyType !== null}
                  onClick={handleGenerateMindMap}
                  className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-3 text-xs font-bold text-amber-800 dark:text-amber-200 transition-colors disabled:opacity-60"
                >
                  {generatingStudyType === "mindmap" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando Mapa Mental...
                    </>
                  ) : (
                    <>
                      <Network className="h-4 w-4" />
                      Gerar Mapa Mental com IA
                    </>
                  )}
                </button>
              </div>

              {generatedFlashcards.length > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      ✓ {generatedFlashcards.length} Flashcards criados para{" "}
                      {activeExam.examName}
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push("/flashcards")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Estudar na aba Flashcards
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {generatedFlashcards.map((fc, i) => (
                      <div
                        key={`gen-exam-fc-${i}`}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-xs space-y-1"
                      >
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          P: {fc.front}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">
                          R: {fc.back}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedQuestions.length > 0 && (
                <div className="rounded-xl border border-blue-500/30 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    ✓ {generatedQuestions.length} Questões salvas no Banco de Questões
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push("/questions")}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Resolver na aba Questões
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {generatedMindMapId && (
                <div className="rounded-xl border border-amber-500/30 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    ✓ Mapa Mental de {activeExam.examName} gerado com sucesso!
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/mindmaps/${generatedMindMapId}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
                  >
                    Abrir Mapa Mental Interativo
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
