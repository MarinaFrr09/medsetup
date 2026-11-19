"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Stethoscope,
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
  Search,
  Eye,
  Loader2,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Pill,
  FlaskConical,
} from "lucide-react";
import {
  BUILTIN_PROGRESSIVE_CASES,
  MEDICAL_DIAGNOSES_CATALOG,
  ProgressiveClinicalCase,
  getDailyClinicalCase,
  getTodayKey,
  isDiagnosisMatch,
  normalizeDiagnosisString,
} from "@/data/clinicalCasesBank";
import { DrugGuessGame } from "@/components/interatividade/DrugGuessGame";
import { ExamGuessGame } from "@/components/interatividade/ExamGuessGame";
import { useAppStore } from "@/stores/useAppStore";
import toast from "react-hot-toast";

export interface CaseAttempt {
  guess: string;
  isCorrect: boolean;
}

export interface SavedCaseProgress {
  caseId: string;
  dateKey: string;
  attempts: CaseAttempt[];
  revealedCluesCount: number;
  status: "playing" | "won" | "lost";
  completedAt?: string;
}

const DAILY_PROGRESS_STORAGE_KEY = "medsetup_daily_clinical_case_progress_v2";
const SAVED_CASES_STORAGE_KEY = "medsetup_user_saved_clinical_cases_v1";

const MEDICAL_AREAS = [
  "Aleatória (Todas as Áreas da Medicina)",
  "Clínica Médica",
  "Emergência / Toxicologia",
  "Cardiologia",
  "Neurologia",
  "Infectologia",
  "Ginecologia e Obstetrícia",
  "Pediatria",
  "Cirurgia Geral e Trauma",
  "Endocrinologia",
  "Nefrologia",
  "Hematologia",
  "Pneumologia",
  "Gastroenterologia",
  "Reumatologia",
];

const DIFFICULTY_OPTIONS = [
  "Aleatório (Fácil a Difícil)",
  "Fácil",
  "Médio",
  "Difícil",
];

function InteratividadeContent() {
  const searchParams = useSearchParams();
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

  // Mode tab: Clinical Cases, Drug Guessing, or Exam Guessing
  const [activeTab, setActiveTab] = useState<"clinical" | "drugs" | "exams">(() => {
    const t = searchParams.get("tab");
    if (t === "drugs") return "drugs";
    if (t === "exams") return "exams";
    return "clinical";
  });

  // Active case state (defaults to today's daily case)
  const [activeCase, setActiveCase] = useState<ProgressiveClinicalCase>(() =>
    getDailyClinicalCase()
  );
  // Only cases explicitly saved by the user via the "Salvar caso" button
  const [savedCases, setSavedCases] = useState<ProgressiveClinicalCase[]>([]);
  const [savedPanelOpen, setSavedPanelOpen] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<CaseAttempt[]>([]);
  const [revealedCluesCount, setRevealedCluesCount] = useState<number>(1);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Diagnosis combobox state
  const [query, setQuery] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Generation controls (Random / AI / PDF)
  const [generatorPanelOpen, setGeneratorPanelOpen] = useState<boolean>(false);
  const [generatorMode, setGeneratorMode] = useState<"random" | "pdf">("random");
  const [selectedArea, setSelectedArea] = useState<string>(MEDICAL_AREAS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(
    DIFFICULTY_OPTIONS[0]
  );
  const [customTopic, setCustomTopic] = useState<string>("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [selectedStoredDocId, setSelectedStoredDocId] = useState<string>("");
  const [isGeneratingCase, setIsGeneratingCase] = useState<boolean>(false);

  // Post-case AI Study Generators (Flashcards, Questões, Mapa Mental)
  const [generatingStudyType, setGeneratingStudyType] = useState<
    "flashcards" | "questions" | "mindmap" | null
  >(null);
  const [generatedFlashcards, setGeneratedFlashcards] = useState<
    Array<{ front: string; back: string }>
  >([]);
  const [generatedDeckId, setGeneratedDeckId] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [generatedMindMapId, setGeneratedMindMapId] = useState<string | null>(
    null
  );

  // Load ONLY user-saved cases and today's daily case (automatically discarding previous days' progress)
  useEffect(() => {
    let loadedSaved: ProgressiveClinicalCase[] = [];
    try {
      const raw = localStorage.getItem(SAVED_CASES_STORAGE_KEY);
      if (raw) {
        loadedSaved = JSON.parse(raw);
        setSavedCases(loadedSaved);
      }
    } catch {}

    // Purge any daily progress from previous days so old cases are never accumulated
    try {
      const todayKey = getTodayKey();
      const rawProg = localStorage.getItem(DAILY_PROGRESS_STORAGE_KEY);
      if (rawProg) {
        const parsed: Record<string, SavedCaseProgress> = JSON.parse(rawProg);
        const todayOnly: Record<string, SavedCaseProgress> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (v?.dateKey === todayKey) {
            todayOnly[k] = v;
          }
        }
        localStorage.setItem(DAILY_PROGRESS_STORAGE_KEY, JSON.stringify(todayOnly));
      }
    } catch {}

    const caseIdParam = searchParams.get("caseId");
    if (caseIdParam) {
      const found = loadedSaved.find((c) => c.id === caseIdParam);
      if (found) {
        loadCase(found, false);
        return;
      }
    }

    // Always load today's updated daily clinical case
    const daily = getDailyClinicalCase();
    loadCase(daily, true);
  }, [searchParams]);

  // Close autocomplete dropdown on outside click
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

  const isCurrentCaseSaved = useMemo(
    () => savedCases.some((c) => c.id === activeCase.id),
    [savedCases, activeCase.id]
  );

  const handleToggleSaveCase = () => {
    if (isCurrentCaseSaved) {
      const updated = savedCases.filter((c) => c.id !== activeCase.id);
      setSavedCases(updated);
      try {
        localStorage.setItem(SAVED_CASES_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      toast.success("Caso removido dos salvos.");
    } else {
      const updated = [activeCase, ...savedCases];
      setSavedCases(updated);
      try {
        localStorage.setItem(SAVED_CASES_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      toast.success("Caso clínico salvo nos seus favoritos!");
    }
  };

  const handleDeleteSavedCase = (id: string) => {
    const updated = savedCases.filter((c) => c.id !== id);
    setSavedCases(updated);
    try {
      localStorage.setItem(SAVED_CASES_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    toast.success("Caso removido dos salvos.");
  };

  const saveCaseProgress = (
    targetCase: ProgressiveClinicalCase,
    nextAttempts: CaseAttempt[],
    nextCluesCount: number,
    nextStatus: "playing" | "won" | "lost"
  ) => {
    // Only keep ephemeral progress for today's daily case (never store old cases)
    if (!targetCase.id.startsWith("daily-")) return;
    try {
      const todayKey = getTodayKey();
      const map: Record<string, SavedCaseProgress> = {
        [targetCase.id]: {
          caseId: targetCase.id,
          dateKey: todayKey,
          attempts: nextAttempts,
          revealedCluesCount: nextCluesCount,
          status: nextStatus,
          completedAt:
            nextStatus !== "playing" ? new Date().toISOString() : undefined,
        },
      };
      localStorage.setItem(DAILY_PROGRESS_STORAGE_KEY, JSON.stringify(map));
    } catch {}
  };

  const loadCase = (
    targetCase: ProgressiveClinicalCase,
    restoreSaved = false
  ) => {
    setActiveCase(targetCase);
    setQuery("");
    setDropdownOpen(false);
    setGeneratedFlashcards([]);
    setGeneratedDeckId(null);
    setGeneratedQuestions([]);
    setGeneratedMindMapId(null);

    if (restoreSaved) {
      try {
        const raw = localStorage.getItem(DAILY_PROGRESS_STORAGE_KEY);
        const map: Record<string, SavedCaseProgress> = raw
          ? JSON.parse(raw)
          : {};
        const saved = map[targetCase.id];
        if (saved && saved.attempts.length > 0) {
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

  const resetCurrentCase = () => {
    try {
      const raw = localStorage.getItem(DAILY_PROGRESS_STORAGE_KEY);
      const map: Record<string, SavedCaseProgress> = raw ? JSON.parse(raw) : {};
      delete map[activeCase.id];
      localStorage.setItem(DAILY_PROGRESS_STORAGE_KEY, JSON.stringify(map));
    } catch {}
    setAttempts([]);
    setRevealedCluesCount(1);
    setStatus("playing");
    setShowExplanation(false);
    setQuery("");
  };

  // All available diagnoses for the searchable dropdown (catalog + current case diagnosis & differentials)
  const availableDiagnoses = useMemo(() => {
    const extra: string[] = [
      activeCase.diagnosis,
      ...(activeCase.debriefing?.differentials?.map((d) => d.name) || []),
      ...((activeCase as any).suggestedDistractors || []),
    ].filter(Boolean);

    const merged = Array.from(new Set([...MEDICAL_DIAGNOSES_CATALOG, ...extra]));
    return merged.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [activeCase]);

  const filteredDiagnoses = useMemo(() => {
    const alreadyGuessed = new Set(
      attempts.map((a) => normalizeDiagnosisString(a.guess))
    );
    const normQ = normalizeDiagnosisString(query);

    return availableDiagnoses
      .filter((item) => !alreadyGuessed.has(normalizeDiagnosisString(item)))
      .filter((item) => {
        if (!normQ) return true;
        return normalizeDiagnosisString(item).includes(normQ);
      })
      .slice(0, 60);
  }, [availableDiagnoses, query, attempts]);

  const remainingAttempts = Math.max(0, 5 - attempts.length);

  const handleGuessSubmit = (selectedDiagnosis?: string) => {
    if (status !== "playing") return;
    const rawGuess = (selectedDiagnosis ?? query).trim();
    if (!rawGuess) {
      toast.error("Selecione ou digite um diagnóstico para tentar.");
      return;
    }

    // Prevent duplicate guess
    const normGuess = normalizeDiagnosisString(rawGuess);
    if (
      attempts.some((a) => normalizeDiagnosisString(a.guess) === normGuess)
    ) {
      toast.error("Você já tentou essa hipótese diagnóstica neste caso.");
      return;
    }

    const correct = isDiagnosisMatch(rawGuess, activeCase);
    const nextAttempts: CaseAttempt[] = [
      ...attempts,
      {
        guess: correct ? activeCase.diagnosis : rawGuess,
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
      saveCaseProgress(activeCase, nextAttempts, 5, "won");
      toast.success(
        `Parabéns! Você acertou o diagnóstico (${activeCase.diagnosis}) na ${nextAttempts.length}ª tentativa!`
      );
      return;
    }

    // Wrong guess
    if (nextAttempts.length >= 5) {
      setAttempts(nextAttempts);
      setRevealedCluesCount(5);
      setStatus("lost");
      setShowExplanation(true);
      saveCaseProgress(activeCase, nextAttempts, 5, "lost");
    } else {
      const nextClues = Math.min(5, nextAttempts.length + 1);
      setAttempts(nextAttempts);
      setRevealedCluesCount(nextClues);
      setStatus("playing");
      saveCaseProgress(activeCase, nextAttempts, nextClues, "playing");
    }
  };

  // Pick a random case from all areas & difficulties (without storing it unless the user clicks "Salvar caso")
  const handlePickBuiltinRandomCase = () => {
    const pool = BUILTIN_PROGRESSIVE_CASES.filter(
      (c) => c.diagnosis !== activeCase.diagnosis
    );
    const filteredPool = pool.filter((c) => {
      const areaMatch =
        selectedArea.startsWith("Aleatória") ||
        c.specialty.toLowerCase().includes(selectedArea.toLowerCase());
      const diffMatch =
        selectedDifficulty.startsWith("Aleatório") ||
        c.difficulty === selectedDifficulty;
      return areaMatch && diffMatch;
    });

    const targetPool = filteredPool.length > 0 ? filteredPool : pool;
    const picked =
      targetPool[Math.floor(Math.random() * targetPool.length)] ||
      BUILTIN_PROGRESSIVE_CASES[0];
    const freshRandomCase: ProgressiveClinicalCase = {
      ...picked,
      id: `rand_${Date.now()}`,
      date: new Date().toLocaleDateString("pt-BR"),
    };
    loadCase(freshRandomCase, false);
    toast.success(`Novo caso clínico aleatório carregado!`);
  };

  // Generate a new 5-clue clinical case with AI (either randomly across all areas or from attached PDFs)
  const handleGenerateAICase = async () => {
    if (
      generatorMode === "pdf" &&
      attachedFiles.length === 0 &&
      !selectedStoredDocId
    ) {
      toast.error(
        "Anexe pelo menos um arquivo PDF ou selecione um material salvo para gerar o caso clínico."
      );
      return;
    }

    setIsGeneratingCase(true);
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

      const recentDiagnoses = [
        activeCase.diagnosis,
        ...savedCases.slice(0, 8).map((c) => c.diagnosis),
      ];

      let res: Response;
      if (generatorMode === "pdf" && attachedFiles.length > 0) {
        const formData = new FormData();
        formData.append("specialty", selectedArea);
        formData.append("difficulty", selectedDifficulty);
        if (customTopic.trim()) formData.append("topic", customTopic.trim());
        if (storedContext) formData.append("materialContext", storedContext);
        formData.append("avoidDiagnoses", JSON.stringify(recentDiagnoses));
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
            specialty: selectedArea,
            difficulty: selectedDifficulty,
            topic: customTopic.trim(),
            materialContext: storedContext,
            avoidDiagnoses: recentDiagnoses,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao gerar caso clínico com IA.");
      }

      const newCase: ProgressiveClinicalCase = {
        id: data.id || `pcase_${Date.now()}`,
        caseNumber: Math.floor(1 + Math.random() * 999),
        date: data.date || new Date().toLocaleDateString("pt-BR"),
        diagnosis: data.diagnosis,
        acceptedSynonyms: data.acceptedSynonyms || [],
        specialty: data.specialty || selectedArea,
        difficulty: data.difficulty || "Médio",
        sourceLabel: sourceLabel || undefined,
        clues: data.clues,
        debriefing: data.debriefing,
      };

      loadCase(newCase, false);
      setGeneratorPanelOpen(false);
      toast.success("Novo caso clínico gerado com IA!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar caso clínico com IA.");
    } finally {
      setIsGeneratingCase(false);
    }
  };

  // Build rich clinical text from the finished case to feed Flashcards, Questions, and MindMap generators
  const buildCaseContextForAI = () => {
    return `CASO CLÍNICO #${activeCase.caseNumber} — DIAGNÓSTICO DEFINITIVO: ${activeCase.diagnosis}
Área: ${activeCase.specialty} | Nível: ${activeCase.difficulty}

1. VINHETA CLÍNICA:
${activeCase.clues[0]}

2. PISTA 2/5 (HISTÓRIA DA DOENÇA ATUAL):
${activeCase.clues[1]}

3. PISTA 3/5 (EXAME FÍSICO DIRECIONADO):
${activeCase.clues[2]}

4. PISTA 4/5 (EXAMES COMPLEMENTARES):
${activeCase.clues[3]}

5. PISTA 5/5 (CONDUTA E EVOLUÇÃO):
${activeCase.clues[4]}

DEBRIEFING E FISIOPATOLOGIA:
${activeCase.debriefing.overview}

ANÁLISE DAS PISTAS:
${activeCase.debriefing.clueBreakdown.map((c, i) => `- Pista ${i + 1}: ${c}`).join("\n")}

DIAGNÓSTICOS DIFERENCIAIS:
${activeCase.debriefing.differentials
  .map((d) => `- ${d.name}: ${d.distinction}`)
  .join("\n")}

CONDUTA E TRATAMENTO PADRÃO-OURO:
${activeCase.debriefing.management}

PÉROLAS CLÍNICAS:
${activeCase.debriefing.pearls.join("\n")}`;
  };

  const handleGenerateFlashcardsFromCase = async () => {
    setGeneratingStudyType("flashcards");
    try {
      const contextText = buildCaseContextForAI();
      const res = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `${activeCase.diagnosis} (Caso Clínico #${activeCase.caseNumber})\n\n${contextText}`,
          count: 8,
          difficulty: "hard",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao gerar flashcards.");
      }

      const cards = Array.isArray(data.flashcards) ? data.flashcards : [];
      if (cards.length === 0) {
        throw new Error("Nenhum flashcard retornado pela IA.");
      }

      const folder = getOrCreateFolder("Casos Clínicos Interativos", "flashcards");
      const deckId = `deck_case_${activeCase.caseNumber}_${Date.now()}`;
      addDeck({
        id: deckId,
        name: `Caso #${activeCase.caseNumber} — ${activeCase.diagnosis}`,
        description: `Flashcards gerados do Caso Clínico #${activeCase.caseNumber} (${activeCase.specialty})`,
        subject: activeCase.specialty,
        folderId: folder.id,
        cardCount: cards.length,
        progress: 0,
        cards: cards.map((c: any, idx: number) => ({
          id: `fc_${Date.now()}_${idx}`,
          front: c.front,
          back: c.back,
        })),
        difficulty: activeCase.difficulty,
      });

      setGeneratedFlashcards(cards);
      setGeneratedDeckId(deckId);
      toast.success(
        `${cards.length} flashcards gerados e salvos na aba Flashcards!`
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar flashcards com IA.");
    } finally {
      setGeneratingStudyType(null);
    }
  };

  const handleGenerateQuestionsFromCase = async () => {
    setGeneratingStudyType("questions");
    try {
      const contextText = buildCaseContextForAI();
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `${activeCase.diagnosis} — ${activeCase.specialty}`,
          content: contextText,
          count: 5,
          difficulty: "hard",
          type: "multiple_choice",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao gerar questões.");
      }

      const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
      if (rawQuestions.length === 0) {
        throw new Error("Nenhuma questão retornada pela IA.");
      }

      const folder = getOrCreateFolder("Casos Clínicos Interativos", "questions");
      const formatted = rawQuestions.map((q: any, idx: number) => ({
        id: `q_case_${activeCase.caseNumber}_${Date.now()}_${idx}`,
        text: q.text,
        type: "multiple_choice",
        difficulty: activeCase.difficulty,
        subject: activeCase.specialty,
        folderId: folder.id,
        options: q.options || [],
        answer: q.answer || "a",
        explanation: q.explanation || "",
        date: new Date().toLocaleDateString("pt-BR"),
        status: "unanswered" as const,
      }));

      addQuestions(formatted);
      setGeneratedQuestions(formatted);
      toast.success(
        `${formatted.length} questões geradas e salvas no Banco de Questões!`
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar questões com IA.");
    } finally {
      setGeneratingStudyType(null);
    }
  };

  const handleGenerateMindMapFromCase = async () => {
    setGeneratingStudyType("mindmap");
    try {
      const contextText = buildCaseContextForAI();
      const res = await fetch("/api/ai/generate-mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `${activeCase.diagnosis} (Fisiopatologia, Diagnóstico e Conduta)\n\n${contextText}`,
          layout: "4d-free",
          detailLevel: "detailed",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao gerar mapa mental.");
      }

      const folder = getOrCreateFolder("Casos Clínicos Interativos", "mindmaps");
      const mapId = `mm_case_${activeCase.caseNumber}_${Date.now()}`;
      addMindMap({
        id: mapId,
        name: `Caso #${activeCase.caseNumber}: ${activeCase.diagnosis}`,
        description: `Mapa mental completo do caso clínico sobre ${activeCase.diagnosis} (${activeCase.specialty})`,
        layout: "4d-free",
        folderId: folder.id,
        date: new Date().toLocaleDateString("pt-BR"),
        nodes: data.nodes || [],
        edges: data.edges || [],
      });

      setGeneratedMindMapId(mapId);
      toast.success("Mapa Mental gerado e salvo em Mapas Mentais!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar mapa mental com IA.");
    } finally {
      setGeneratingStudyType(null);
    }
  };

  const clueTitles = [
    "Vinheta clínica",
    "Pista 2/5",
    "Pista 3/5",
    "Pista 4/5",
    "Pista 5/5",
  ];

  return (
    <div className="w-full max-w-4xl mx-auto pb-16 space-y-6">
      {/* Mode Switcher: Casos Clínicos | Adivinhar Remédio | Adivinhar Exame */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-2xl border border-border/80 bg-card/90 p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("clinical")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "clinical"
              ? "bg-[#12b76a] text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Stethoscope className="h-4 w-4" />
          <span>Casos Clínicos</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("drugs")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "drugs"
              ? "bg-[#12b76a] text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Pill className="h-4 w-4" />
          <span>Adivinhar Remédio</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("exams")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "exams"
              ? "bg-[#12b76a] text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          <span>Adivinhar Exame</span>
        </button>
      </div>

      {activeTab === "drugs" ? (
        <DrugGuessGame />
      ) : activeTab === "exams" ? (
        <ExamGuessGame />
      ) : (
        <>
      {/* Top Action Toolbar: Caso do Dia | Sortear Caso Aleatório | Gerar com IA / PDF */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/90 p-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Casos Clínicos Pontuais
            </h2>
            <p className="text-xs text-muted-foreground">
              Revele as pistas a cada chute e estude o debriefing completo ao final
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const daily = getDailyClinicalCase();
              loadCase(daily, true);
              toast.success(`Caso Clínico do Dia (#${daily.caseNumber}) carregado!`);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Caso do Dia
          </button>

          <button
            type="button"
            onClick={handlePickBuiltinRandomCase}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/70 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Próximo Caso Aleatório
          </button>

          {savedCases.length > 0 && (
            <button
              type="button"
              onClick={() => setSavedPanelOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              <BookmarkCheck className="h-3.5 w-3.5" />
              Salvos ({savedCases.length})
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

      {/* Saved Cases Drawer (Only shows cases the user explicitly saved) */}
      {savedPanelOpen && savedCases.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-card p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <BookmarkCheck className="h-4 w-4" />
              Casos Clínicos Salvos por Você ({savedCases.length})
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
            {savedCases.map((sc) => (
              <div
                key={sc.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/80 p-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    loadCase(sc, false);
                    setSavedPanelOpen(false);
                  }}
                  className="text-left flex-1 min-w-0"
                >
                  <div className="text-xs font-bold text-foreground truncate">
                    Caso clínico — {sc.date}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {sc.clues[0]}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSavedCase(sc.id)}
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

      {/* Expandable Panel: Generate Random Case with AI or From Attached PDFs */}
      {generatorPanelOpen && (
        <div className="rounded-2xl border border-emerald-500/30 bg-card p-5 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Gerar Novo Caso Clínico com IA
              </h3>
              <p className="text-xs text-muted-foreground">
                Escolha entre um caso clínico inédito de qualquer área da medicina ou anexe seus PDFs
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
                Aleatório (Todas as Áreas)
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
                Área da Medicina
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {MEDICAL_AREAS.map((area) => (
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
                placeholder="Ex: Síndrome ictérica, Intoxicações..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>

          {generatorMode === "pdf" && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Direct PDF Upload */}
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 text-center cursor-pointer hover:bg-emerald-500/10 transition-colors">
                  <Upload className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-1.5" />
                  <span className="text-xs font-semibold text-foreground">
                    Clique para anexar PDF(s), Word ou Slides
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    O caso de 5 pistas será criado fielmente sobre o seu arquivo
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

                {/* Or pick from already loaded PDFs/transcriptions in MedSetup */}
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
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Você pode combinar arquivos anexados do seu computador ou materiais já processados.
                  </p>
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
              disabled={isGeneratingCase}
              onClick={handleGenerateAICase}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {isGeneratingCase ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Construindo 5 Pistas e Debriefing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {generatorMode === "pdf"
                    ? "Gerar Caso a partir do PDF"
                    : "Sortear e Gerar Caso com IA"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MAIN CLINICAL CASE CONTAINER (Exact Style of Reference Images) */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-slate-900/95 p-6 sm:p-8 shadow-sm space-y-5">
        {/* Case Header: Caso clínico #202 + Date + Reset / Quick Switch */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {activeCase.id.startsWith("daily-")
                ? "Caso clínico do dia"
                : "Caso clínico"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-sm text-slate-400 dark:text-slate-400">
                {activeCase.date}
              </span>
              {activeCase.sourceLabel && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  <FileText className="h-3 w-3" />
                  {activeCase.sourceLabel}
                </span>
              )}
              {status !== "playing" && (
                <>
                  <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {activeCase.specialty}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                      activeCase.difficulty === "Fácil"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : activeCase.difficulty === "Médio"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    Nível: {activeCase.difficulty}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Button to explicitly save this clinical case if the user wants to keep it */}
            <button
              type="button"
              onClick={handleToggleSaveCase}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isCurrentCaseSaved
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {isCurrentCaseSaved ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  Caso salvo
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5" />
                  Salvar caso
                </>
              )}
            </button>

            {(attempts.length > 0 || status !== "playing") && (
              <button
                type="button"
                onClick={resetCurrentCase}
                title="Reiniciar este caso clínico"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar
              </button>
            )}
          </div>
        </div>

        {/* PROGRESSIVE CLUE CARDS (1 to revealedCluesCount, in exact order) */}
        <div className="space-y-4">
          {activeCase.clues.slice(0, revealedCluesCount).map((clueText, idx) => (
            <div
              key={`${activeCase.id}-clue-${idx}`}
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

        {/* WHILE PLAYING: 5-Bar Progress + TENTATIVAS + Autocomplete Input + Tentar Button */}
        {status === "playing" && (
          <div className="space-y-4 pt-1">
            {/* 5 Horizontal Segmented Bars */}
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

            {/* TENTATIVAS List */}
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

            {/* Searchable Diagnosis Selector + Tentar Button */}
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
                        Math.min(prev + 1, Math.max(0, filteredDiagnoses.length - 1))
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex((prev) => Math.max(0, prev - 1));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (
                        dropdownOpen &&
                        filteredDiagnoses.length > 0 &&
                        query.trim().length > 0
                      ) {
                        const exactOrHighlighted =
                          filteredDiagnoses[highlightedIndex] || query;
                        setQuery(exactOrHighlighted);
                        setDropdownOpen(false);
                        handleGuessSubmit(exactOrHighlighted);
                      } else if (query.trim()) {
                        handleGuessSubmit(query);
                      }
                    } else if (e.key === "Escape") {
                      setDropdownOpen(false);
                    }
                  }}
                  placeholder="Selecione um diagnóstico..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-4 py-3.5 text-[16px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#12b76a] focus:outline-none focus:ring-2 focus:ring-[#12b76a]/20"
                />

                {/* Autocomplete Dropdown */}
                {dropdownOpen && filteredDiagnoses.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 shadow-xl">
                    {filteredDiagnoses.map((diag, idx) => (
                      <button
                        key={diag}
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => {
                          setQuery(diag);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                          idx === highlightedIndex
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                        }`}
                      >
                        <span>{diag}</span>
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
                  saveCaseProgress(activeCase, attempts, 5, "lost");
                }}
                className="rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 px-5 py-3.5 text-[15px] font-semibold text-red-600 dark:text-red-300 transition-colors shrink-0"
              >
                Desistir
              </button>
            </div>
          </div>
        )}

        {/* END-OF-CASE SUMMARY CARD (Exact Style of Screenshot 6 — WITHOUT % of players!) */}
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
                {activeCase.diagnosis}
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

            {/* SUAS HIPÓTESES (X/5) */}
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
                    key={`final-${att.guess}-${idx}`}
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

            {/* Ver explicação button */}
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

        {/* DETAILED DEBRIEFING SECTION */}
        {status !== "playing" && showExplanation && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-6 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Debriefing Clínico Detalhado
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {activeCase.diagnosis} — Raciocínio e Conduta
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-slate-200/80 dark:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {activeCase.specialty}
                </span>
                <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {activeCase.difficulty}
                </span>
              </div>
            </div>

            {/* 1. Fisiopatologia e Visão Geral */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                1. Fisiopatologia e Síntese do Caso
              </h4>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">
                {activeCase.debriefing.overview}
              </p>
            </div>

            {/* 2. Dissecção Pista por Pista */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                2. Interpretação de Cada Pista (1 a 5)
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {activeCase.debriefing.clueBreakdown.map((exp, idx) => (
                  <div
                    key={`debrief-clue-${idx}`}
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

            {/* 3. Diagnósticos Diferenciais */}
            {activeCase.debriefing.differentials?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  3. Principais Diagnósticos Diferenciais e Como Descartar
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeCase.debriefing.differentials.map((diff, idx) => (
                    <div
                      key={`diff-${idx}`}
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

            {/* 4. Conduta e Tratamento Padrão-Ouro */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                4. Conduta Médica Padrão-Ouro e Tratamento
              </h4>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                {activeCase.debriefing.management}
              </div>
            </div>

            {/* 5. Pérolas Clínicas */}
            {activeCase.debriefing.pearls?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  5. Pérolas Clínicas de Alto Rendimento
                </h4>
                <ul className="space-y-1.5">
                  {activeCase.debriefing.pearls.map((pearl, idx) => (
                    <li
                      key={`pearl-${idx}`}
                      className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200"
                    >
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{pearl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 6. AI STUDY TOOLS FOR THIS CLINICAL CASE: FLASHCARDS, QUESTÕES E MAPA MENTAL */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Transformar este Caso Clínico em Material de Estudo com IA
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gere flashcards, questões comentadas ou um mapa mental diretamente sobre{" "}
                  <strong>{activeCase.diagnosis}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Button 1: Flashcards */}
                <button
                  type="button"
                  disabled={generatingStudyType !== null}
                  onClick={handleGenerateFlashcardsFromCase}
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

                {/* Button 2: Questões */}
                <button
                  type="button"
                  disabled={generatingStudyType !== null}
                  onClick={handleGenerateQuestionsFromCase}
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

                {/* Button 3: Mapa Mental */}
                <button
                  type="button"
                  disabled={generatingStudyType !== null}
                  onClick={handleGenerateMindMapFromCase}
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

              {/* Inline Preview & Shortcut for Generated Flashcards */}
              {generatedFlashcards.length > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      ✓ {generatedFlashcards.length} Flashcards criados para{" "}
                      {activeCase.diagnosis}
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
                        key={`gen-fc-${i}`}
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

              {/* Inline Preview & Shortcut for Generated Questions */}
              {generatedQuestions.length > 0 && (
                <div className="rounded-xl border border-blue-500/30 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                </div>
              )}

              {/* Shortcut for Generated Mind Map */}
              {generatedMindMapId && (
                <div className="rounded-xl border border-amber-500/30 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    ✓ Mapa Mental de {activeCase.diagnosis} gerado com sucesso!
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
        </>
      )}
    </div>
  );
}

export default function InteratividadePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-4xl mx-auto p-8 text-center text-sm text-muted-foreground">
          Carregando Caso Clínico Interativo...
        </div>
      }
    >
      <InteratividadeContent />
    </Suspense>
  );
}
