"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import QuestionCard from "@/components/questions/QuestionCard";
import VerticalFolderSidebar from "@/components/common/VerticalFolderSidebar";

import FolderMasteryCard from "@/components/questions/FolderMasteryCard";
import QuestionsStatsCards from "@/components/questions/QuestionsStatsCards";
const QuestionEditor = dynamic(() => import("@/components/questions/QuestionEditor"), { ssr: false });
const AIGenerateModal = dynamic(() => import("@/components/questions/AIGenerateModal"), { ssr: false });
const QuizMode = dynamic(() => import("@/components/questions/QuizMode"), { ssr: false });
const QuestionDetailModal = dynamic(() => import("@/components/questions/QuestionDetailModal"), { ssr: false });
import {
  Plus,
  Sparkles,
  Search,
  BookOpen,
  HelpCircle,
  Play,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Folder as FolderIcon,
} from "lucide-react";
import { useAppStore, Question } from "@/stores/useAppStore";

export default function QuestionsPage() {
  const { questions, folders, addQuestions } = useAppStore();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[] | null>(null);
  const [quizInitialIndex, setQuizInitialIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedQuestionForDetail, setSelectedQuestionForDetail] = useState<Question | null>(null);

  const handleSelectFolder = (folderId: string | null) => {
    setIsQuizMode(false);
    setQuizQuestions(null);
    setQuizInitialIndex(0);
    setSelectedFolderId(folderId);
  };

  const questionFolders = useMemo(
    () => folders.filter((f) => f.type === "questions"),
    [folders]
  );

  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return questionFolders.find((f) => f.id === selectedFolderId) || null;
  }, [questionFolders, selectedFolderId]);

  const handleQuestionsGenerated = (
    newQuestions: any[],
    targetFolderId?: string
  ) => {
    let finalFolderId = targetFolderId || selectedFolderId;
    const firstSubject = (newQuestions[0]?.subject || "").trim();
    if (!finalFolderId && firstSubject && firstSubject.toLowerCase() !== "geral") {
      const folder = useAppStore.getState().getOrCreateFolder(firstSubject, "questions");
      finalFolderId = folder.id;
    }
    finalFolderId = finalFolderId || "folder-q-geral";
    const destFolder = questionFolders.find((f) => f.id === finalFolderId);

    const formatted: Question[] = newQuestions.map((q: any, idx: number) => ({
      id: Date.now().toString() + "-" + idx,
      text: q.question || q.text,
      type:
        q.type === "multiple_choice"
          ? "Múltipla Escolha"
          : q.type === "true_false"
          ? "V/F"
          : "Dissertativa",
      difficulty:
        q.difficulty === "easy" || q.difficulty === "Fácil"
          ? "Fácil"
          : q.difficulty === "hard" || q.difficulty === "Difícil"
          ? "Difícil"
          : "Médio",
      subject: destFolder?.name || q.subject || "Geral",
      folderId: finalFolderId,
      options: q.options || [],
      answer: q.answer,
      explanation: q.explanation,
      date: "Hoje",
      status: "unanswered",
      timesAnswered: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
    }));

    addQuestions(formatted);
  };

  const activeFolderIds = useMemo(() => {
    if (selectedFolderId === null) return null;
    const getDescendants = (id: string): string[] => {
      const children = questionFolders.filter((f) => f.parentId === id).map((f) => f.id);
      return [id, ...children.flatMap(getDescendants)];
    };
    return new Set(getDescendants(selectedFolderId));
  }, [selectedFolderId, questionFolders]);

  // All questions belonging to active folder tree (for statistics)
  const folderQuestions = useMemo(() => {
    if (!selectedFolderId || !activeFolderIds) return [];
    return questions.filter((q) => activeFolderIds.has(q.folderId || "folder-q-geral"));
  }, [questions, selectedFolderId, activeFolderIds]);

  // Filtered questions
  const displayedQuestions = useMemo(() => {
    return questions.filter((q) => {
      const qFolder = q.folderId || "folder-geral";
      const matchesFolder =
        activeFolderIds === null || activeFolderIds.has(qFolder);
      const matchesSearch =
        !searchQuery.trim() ||
        (q.text && q.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.subject && q.subject.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType =
        !selectedType ||
        q.type === selectedType ||
        (selectedType === "Múltipla Escolha" && (q.type === "multiple-choice" || q.type === "Múltipla Escolha"));
      const matchesDiff =
        !selectedDifficulty || q.difficulty === selectedDifficulty;
      return matchesFolder && matchesSearch && matchesType && matchesDiff;
    });
  }, [
    questions,
    activeFolderIds,
    searchQuery,
    selectedType,
    selectedDifficulty,
  ]);

  const handleStartQuiz = (customList?: Question[], startIndex: number = 0) => {
    setQuizInitialIndex(startIndex);
    if (customList && customList.length > 0) {
      setQuizQuestions(customList);
    } else if (selectedFolderId) {
      setQuizQuestions(
        displayedQuestions.length > 0
          ? displayedQuestions
          : questions.filter((q) => q.folderId === selectedFolderId)
      );
    } else {
      setQuizQuestions(questions);
    }
    setIsQuizMode(true);
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header - hidden during QuizMode for clean focus */}
      {!isQuizMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-[#2a2d3a]">
          <div className="flex items-center gap-3">
            {selectedFolderId && (
              <button
                type="button"
                onClick={() => handleSelectFolder(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Voltar ao Dashboard Geral"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="text-blue-600 dark:text-blue-500" size={22} />
                <span>
                  {selectedFolderId
                    ? activeFolder?.name || "Pasta de Questões"
                    : "Banco de Questões"}
                </span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-xs">
                {selectedFolderId
                  ? `Visualizando e praticando questões arquivadas na pasta "${activeFolder?.name}"`
                  : "Pratique questões médicas, filtre por dificuldade e acompanhe seu rendimento"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {displayedQuestions.length > 0 && (
              <button
                onClick={() => handleStartQuiz(displayedQuestions)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
              >
                <Play size={13} className="fill-white" />
                <span>
                  Praticar Quiz ({displayedQuestions.length})
                </span>
              </button>
            )}

            <button
              onClick={() => setIsAIOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xs shadow-blue-500/20 cursor-pointer"
            >
              <Sparkles size={13} />
              <span>Gerar com IA</span>
            </button>

            <button
              onClick={() => {
                setEditingQuestion(null);
                setIsEditorOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
            >
              <Plus size={13} />
              <span>Nova Questão</span>
            </button>
          </div>
        </div>
      )}

      {/* When in QuizMode: Sidebar on left + Question Card in the EXACT horizontal center of the screen */}
      {isQuizMode ? (
        <div className="w-full py-1 sm:py-3">
          <div className="w-full grid grid-cols-1 lg:grid-cols-[288px_minmax(0,1fr)_288px] xl:grid-cols-[320px_minmax(0,1fr)_320px] gap-6 items-start">
            {/* Left Column: Vertical Folder Sidebar */}
            <div className="w-full">
              <VerticalFolderSidebar
                selectedFolderId={selectedFolderId}
                onSelectFolder={handleSelectFolder}
                type="questions"
                className="w-full shrink-0"
              />
            </div>

            {/* Center Column: QuizMode Card - Perfectly Centered in the Viewport */}
            <div className="w-full flex justify-center min-w-0">
              <div className="w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
                <QuizMode
                  questions={quizQuestions || questions}
                  initialIndex={quizInitialIndex}
                  onClose={() => {
                    setIsQuizMode(false);
                    setQuizQuestions(null);
                    setQuizInitialIndex(0);
                  }}
                  inline
                />
              </div>
            </div>

            {/* Right Column: Symmetrical Balancer ensuring 100% mathematical center */}
            <div className="hidden lg:block w-full pointer-events-none invisible" aria-hidden="true" />
          </div>
        </div>
      ) : (
        /* Main 2-Column Master-Detail Layout when not in Quiz */
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* Left Column: Vertical Folder Sidebar + Quick Filters */}
          <VerticalFolderSidebar
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            type="questions"
            className="w-full lg:w-72 xl:w-80 shrink-0"
            extraFilterSlot={
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <Filter size={14} className="text-blue-500" />
                    <span>Filtros Rápidos</span>
                  </span>
                  {(selectedType || selectedDifficulty) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedType("");
                        setSelectedDifficulty("");
                      }}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Dificuldade */}
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block mb-1.5">
                    Dificuldade:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["Fácil", "Médio", "Difícil"].map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() =>
                          setSelectedDifficulty(
                            selectedDifficulty === diff ? "" : diff
                          )
                        }
                        className={`py-1.5 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          selectedDifficulty === diff
                            ? diff === "Fácil"
                              ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300"
                              : diff === "Médio"
                              ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-gray-50 dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-100"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block mb-1.5">
                    Tipo de Questão:
                  </label>
                  <div className="space-y-1">
                    {[
                      { id: "Múltipla Escolha", label: "Múltipla Escolha" },
                      { id: "V/F", label: "Verdadeiro / Falso" },
                      { id: "Dissertativa", label: "Dissertativa" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setSelectedType(selectedType === t.id ? "" : t.id)
                        }
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                          selectedType === t.id
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-bold ring-1 ring-blue-300/60"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        <span>{t.label}</span>
                        {selectedType === t.id && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            }
          />

          {/* Right Column: Main Content */}
          <div className="flex-1 min-w-0 space-y-5 w-full">
            {/* Estatística de Nível de Domínio da Pasta (apenas quando pasta selecionada) */}
            {selectedFolderId && (
              <FolderMasteryCard
                folder={activeFolder}
                questions={folderQuestions}
                onStartQuiz={handleStartQuiz}
              />
            )}

            {/* Estatísticas Gerais (Atividade 7 dias + Progresso por Pasta - Idêntico aos Flashcards) */}
            {!selectedFolderId && !searchQuery && !selectedType && !selectedDifficulty && (
              <QuestionsStatsCards onSelectFolder={handleSelectFolder} />
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-gray-200 dark:border-[#2a2d3a] pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {selectedFolderId ? (
                    <FolderIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                  <span>
                    {selectedFolderId
                      ? `Questões em "${activeFolder?.name}"`
                      : searchQuery || selectedType || selectedDifficulty
                      ? "Resultados da Busca & Filtros"
                      : "Todas as Questões Cadastradas"}
                  </span>
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {displayedQuestions.length}{" "}
                  {displayedQuestions.length === 1
                    ? "questão disponível"
                    : "questões disponíveis"}
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Buscar questões..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-900 shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-white"
                />
              </div>
            </div>

            {/* Questions Grid */}
            {displayedQuestions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {displayedQuestions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    onClick={() => {
                      const idx = displayedQuestions.findIndex((item) => item.id === q.id);
                      handleStartQuiz(displayedQuestions, idx >= 0 ? idx : 0);
                    }}
                    onEdit={(question) => {
                      setEditingQuestion(question);
                      setIsEditorOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white dark:bg-[#1A1D27] rounded-2xl border border-dashed border-gray-300 dark:border-[#2a2d3a]">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-2">
                  <HelpCircle className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  Nenhuma questão encontrada
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-xs mb-4">
                  Gere novas questões com IA para esta pasta ou crie manualmente para começar a praticar.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAIOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>Gerar com IA</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingQuestion(null);
                      setIsEditorOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] px-3.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Criar Manualmente</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <QuestionEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingQuestion(null);
        }}
        questionToEdit={editingQuestion}
        defaultFolderId={selectedFolderId}
      />

      <AIGenerateModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        defaultFolderId={selectedFolderId}
        onQuestionsGenerated={handleQuestionsGenerated}
      />

      {/* Question Detail Modal (opened when clicking anywhere on question card) */}
      <QuestionDetailModal
        isOpen={!!selectedQuestionForDetail}
        question={selectedQuestionForDetail}
        onClose={() => setSelectedQuestionForDetail(null)}
        onEdit={(question) => {
          setSelectedQuestionForDetail(null);
          setEditingQuestion(question);
          setIsEditorOpen(true);
        }}
        allQuestions={displayedQuestions.length > 0 ? displayedQuestions : questions}
        onSelectQuestion={(q) => setSelectedQuestionForDetail(q)}
      />
    </div>
  );
}
