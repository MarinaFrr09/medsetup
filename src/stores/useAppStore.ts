"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ThemeMode } from "@/types";
import type { AtelieResult, AtelieMindMapData } from "@/lib/atelie";
import { cleanFlashcardText } from "@/lib/text-sanitize";


export interface Folder {
  id: string;
  name: string;
  color?: string;
  type: "flashcards" | "questions" | "both" | "mindmaps" | "anotacoes" | "caderno-erros";
  parentId?: string | null;
  createdAt: string;
}

export interface Flashcard {
  id?: string;
  front: string;
  back: string;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  folderId?: string;
  cardCount: number;
  progress?: number;
  lastStudied?: string;
  cards: Flashcard[];
  difficulty?: string;
}

export interface FlashcardReview {
  id: string;
  deckId: string;
  deckName: string;
  cardIndex: number;
  rating: "easy" | "medium" | "hard";
  reviewedAt: string; // ISO timestamp
}

export interface Question {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  subject?: string;
  folderId?: string;
  options?: Array<{ id: string; text: string }>;
  answer?: string;
  explanation?: string;
  date?: string;
  status?: "unanswered" | "correct" | "incorrect";
  userAnswer?: string;
  timesAnswered?: number;
  timesCorrect?: number;
  timesIncorrect?: number;
  lastAnsweredAt?: string;
  isFlaggedForReview?: boolean;
}

export interface MindMapItem {
  id: string;
  name: string;
  description?: string;
  layout?: string;
  colorTheme?: string;
  folderId?: string;
  date: string;
  nodes: any[];
  edges: any[];
}

export interface AudioRecording {
  id: string;
  title: string;
  duration: string;
  date: string;
  processedData: any;
}

export interface DocumentTranscription {
  id: string;
  title: string;
  fileName: string;
  date: string;
  expanded: boolean;
  content: string; // Transcrição Fiel (100% das palavras na ordem do documento)
  summary?: string; // Resumo Master (Padrão ResumoPro)
  keyPoints?: string[];
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  files?: Array<{ name: string; url?: string; size?: number; type?: string }>;
}

export interface MaterialItem {
  id: string;
  name: string;
  type: "pdf" | "image" | "doc" | "audio" | "link";
  size: string;
  subject: string;
  date: string;
  tags?: string[];
  url?: string;
}

export interface SimuladoQuestion {
  id: string;
  number: number;
  text: string;
  type: "multiple_choice" | "essay";
  options?: Array<{ id: string; text: string }>;
  answer: string;
  explanation: string;
  userAnswer?: string;
  essayScore?: number; // 0.0 to 10.0
  essayFeedback?: string;
  isCorrect?: boolean;
  imageUrl?: string;
  imageCaption?: string;
  histologyTissue?: string;
}

export interface SimuladoExam {
  id: string;
  title: string;
  subject?: string;
  date: string;
  durationMinutes: number;
  hasTimer: boolean;
  timeSpentSeconds: number;
  status: "in_progress" | "completed";
  score?: number; // 0.0 to 10.0
  correctCount?: number;
  totalQuestions: number;
  essayCount: number;
  questions: SimuladoQuestion[];
  completedAt?: string;
}

export interface AtelieAnalysis {
  id: string;
  title: string;
  fileName: string;
  date: string;
  tutoriaCase?: string;
  userNotes?: string;
  result: AtelieResult;
  mindMap?: AtelieMindMapData;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  files?: Array<{ name: string; url?: string; size?: number; type?: string }>;
  customMarkdown?: string;
  customSummaryMarkdown?: string;
  selectedBookTitles?: string[];
}

export interface BookItem {
  id: string;
  title: string;
  author?: string;
  subject?: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
  pageCount?: number;
  coverColor?: string;
  createdAt: string;
}

export interface TutoriaLearningQuestion {
  question: string;
  detailedAnswer: string;
}

export interface TutoriaResult {
  title: string;
  caseTranscription?: string;
  unknownTerms: Array<{ term: string; definition: string }>;
  hypothesisAnalysis: Array<{
    hypothesis: string;
    judgment?: string;
    explanation?: string;
    rationale?: string;
  }>;
  clinicalConclusion: {
    summary: string;
    clinicalReasoning: string;
    conductAndOutcome: string;
    differentialTable?: string;
  };
  learningQuestions: Array<{
    question: string;
    detailedAnswer: string;
  }>;
  references?: string[];
  markdownContent: string;
}

export interface TutoriaAnalysis {
  id: string;
  title: string;
  fileName: string;
  date: string;
  userNotes?: string;
  selectedBookIds?: string[];
  selectedBookTitles?: string[];
  result: TutoriaResult;
  customMarkdown?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  files?: Array<{ name: string; url?: string; size?: number; type?: string }>;
  detailLevel?: string;
  mindMap?: {
    title?: string;
    nodes: any[];
    edges: any[];
  };
}

export interface ImageReadingItem {
  id: string;
  name: string;
  date: string;
  type: "board" | "summary" | "mindmap";
  result: any;
  imageUrl?: string;
  imageFileName?: string;
  expanded?: boolean;
  createdAt: string;
}

export interface TrashItem {
  id: string;
  originalId: string;
  name: string;
  type: "question" | "flashcard" | "mindmap" | "audio" | "material" | "folder" | "simulado" | "atelie" | "transcription" | "tutoria" | "book" | "caderno_error" | "anotacao" | "image_reading";
  deletedAt: string;
  data: any;
}

export type CausaErroTipo =
  | "conceitual"       // Não dominava a teoria ou conceito base
  | "pegadinha"        // Caiu no distrator ou pegadinha do enunciado
  | "interpretacao"    // Erro de interpretação do caso clínico
  | "detalhe_conduta"  // Detalhe de conduta médica, manejo ou diretriz
  | "falta_atencao";   // Desatenção ao comando da questão

export interface CadernoErrorFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: string;
}

export interface CadernoErrorItem {
  id: string;
  folderId?: string;
  origin: "question" | "simulado" | "manual";
  originTitle?: string;
  questionId?: string;

  // Questão original para consulta sanfona
  originalQuestion: {
    text: string;
    options?: Array<{ id: string; text: string }>;
    userAnswer?: string;
    correctAnswer: string;
    explanation?: string;
    imageUrl?: string;
    imageCaption?: string;
  };

  // 1. O Ponto Cego (Core Concept)
  pontoCego: string;

  // 2. A Pegadinha / Distrator
  pegadinhaDistrator: string;

  // 3. Gatilho de Memória (Regra de Bolso)
  gatilhoMemoria: string;

  // 4. Referência e Tema
  especialidade: string;
  subtema: string;
  referenciaFonte?: string;

  // 5. Causa do Erro (para métricas e gráficos)
  causaErro: CausaErroTipo;

  // 6. Área para o aluno adicionar suas próprias anotações
  userNotes?: string;

  // Status & Fila de Prioridade
  status: "pendente" | "revisado" | "dominado";
  priority: "alta" | "media" | "baixa";
  revisoesCount: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  createdAt: string;
}

export interface AnotacaoHighlight {
  id: string;
  text: string;
  color: "yellow" | "green" | "pink" | "blue" | "purple";
  tag?: string;
  createdAt?: string;
}

export interface AnotacaoFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: string;
}

export type AnotacaoSourceType = "question" | "simulado" | "atelie" | "flashcard" | "manual";

export interface AnotacaoItem {
  id: string;
  folderId?: string;
  title: string;
  content: string;
  highlights: AnotacaoHighlight[];
  tags: string[];
  materia?: string;
  subtema?: string;
  priority: "alta" | "media" | "baixa";
  isPinned?: boolean;
  isFavorite?: boolean;
  colorTheme?: string;
  source?: {
    type: AnotacaoSourceType;
    title: string;
    originId?: string;
    snippet?: string;
    originalQuestion?: {
      text: string;
      options?: Array<{ id: string; text: string }>;
      userAnswer?: string;
      correctAnswer: string;
      explanation?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  searchQuery: string;

  // Study Data Collections
  folders: Folder[];
  flashcardDecks: Deck[];
  flashcardReviews: FlashcardReview[];
  questions: Question[];
  simulados: SimuladoExam[];
  mindmaps: MindMapItem[];
  audioRecordings: AudioRecording[];
  documentTranscriptions: DocumentTranscription[];
  atelieAnalyses: AtelieAnalysis[];
  tutoriaAnalyses: TutoriaAnalysis[];
  imageReadings: ImageReadingItem[];
  books: BookItem[];
  materials: MaterialItem[];
  cadernoFolders: CadernoErrorFolder[];
  cadernoErrors: CadernoErrorItem[];
  anotacaoFolders: AnotacaoFolder[];
  anotacoes: AnotacaoItem[];
  trashItems: TrashItem[];

  // Global Actions
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Folder Actions
  addFolder: (folder: Folder) => void;
  updateFolder: (folder: Folder) => void;
  deleteFolder: (folderId: string) => void;
  getOrCreateFolder: (name: string, type?: "flashcards" | "questions" | "both" | "mindmaps" | "anotacoes" | "caderno-erros") => Folder;

  // Flashcards Actions
  addDeck: (deck: Deck) => void;
  updateDeck: (deck: Deck) => void;
  deleteDeck: (deckId: string) => void;
  deleteDecks: (deckIds: string[]) => void;
  addCardToDeck: (deckNameOrId: string, card: Flashcard, folderId?: string) => void;
  addCardsToDeck: (deckId: string, cards: Flashcard[]) => void;
  updateFlashcardInDeck: (deckId: string, cardIndex: number, card: Flashcard) => void;
  deleteCardFromDeck: (deckId: string, cardIndex: number) => void;
  moveDeckToFolder: (deckId: string, folderId: string | undefined) => void;
  recordFlashcardReview: (review: Omit<FlashcardReview, "id" | "reviewedAt">) => void;

  // Questions Actions
  addQuestion: (question: Question) => void;
  addQuestions: (questions: Question[]) => void;
  updateQuestion: (question: Question) => void;
  deleteQuestion: (questionId: string) => void;
  deleteQuestions: (questionIds: string[]) => void;
  clearQuestionsByFolder: (folderId: string | null) => void;
  moveQuestionToFolder: (questionId: string, folderId: string | undefined) => void;
  recordQuestionAnswer: (questionId: string, isCorrect: boolean, selectedOption?: string) => void;
  toggleQuestionReview: (questionId: string) => void;
  resetQuestionStats: (questionId?: string) => void;

  // Simulados Actions
  addSimulado: (simulado: SimuladoExam) => void;
  updateSimulado: (simulado: SimuladoExam) => void;
  deleteSimulado: (simuladoId: string) => void;

  // MindMaps Actions
  addMindMap: (map: MindMapItem) => void;
  updateMindMap: (map: MindMapItem) => void;
  deleteMindMap: (mapId: string) => void;
  moveMindMapToFolder: (mapId: string, folderId: string | undefined) => void;

  // Audio Actions
  addAudioRecording: (recording: AudioRecording) => void;
  updateAudioRecording: (recordingId: string, updates: Partial<AudioRecording>) => void;
  deleteAudioRecording: (recordingId: string) => void;

  // Document Transcription Actions
  addDocumentTranscription: (transcription: DocumentTranscription) => void;
  updateDocumentTranscription: (transcriptionId: string, updates: Partial<DocumentTranscription>) => void;
  deleteDocumentTranscription: (transcriptionId: string) => void;

  // Ateliê (SP) Actions
  addAtelieAnalysis: (analysis: AtelieAnalysis) => void;
  updateAtelieAnalysis: (analysisId: string, updates: Partial<AtelieAnalysis>) => void;
  deleteAtelieAnalysis: (analysisId: string) => void;

  // Tutoria Actions
  addTutoriaAnalysis: (analysis: TutoriaAnalysis) => void;
  updateTutoriaAnalysis: (id: string, updates: Partial<TutoriaAnalysis>) => void;
  deleteTutoriaAnalysis: (id: string) => void;

  // Image Reading Actions
  addImageReading: (item: ImageReadingItem) => void;
  updateImageReading: (id: string, updates: Partial<ImageReadingItem>) => void;
  deleteImageReading: (id: string) => void;

  // Books Actions
  addBook: (book: BookItem) => void;
  updateBook: (bookId: string, updates: Partial<BookItem>) => void;
  deleteBook: (bookId: string) => void;

  // Materials Actions
  addMaterial: (material: MaterialItem) => void;
  deleteMaterial: (materialId: string) => void;

  // Caderno de Erros Actions
  addCadernoFolder: (folder: CadernoErrorFolder) => void;
  updateCadernoFolder: (id: string, updates: Partial<CadernoErrorFolder>) => void;
  deleteCadernoFolder: (id: string) => void;

  addCadernoError: (errorItem: CadernoErrorItem) => void;
  updateCadernoError: (id: string, updates: Partial<CadernoErrorItem>) => void;
  deleteCadernoError: (id: string) => void;
  batchAddCadernoErrors: (items: CadernoErrorItem[]) => void;
  moveCadernoErrorToFolder: (errorId: string, folderId: string | undefined) => void;

  // Anotações Actions
  addAnotacaoFolder: (folder: AnotacaoFolder) => void;
  updateAnotacaoFolder: (id: string, updates: Partial<AnotacaoFolder>) => void;
  deleteAnotacaoFolder: (id: string) => void;

  addAnotacao: (anotacao: Omit<AnotacaoItem, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string; updatedAt?: string }) => AnotacaoItem;
  updateAnotacao: (id: string, updates: Partial<AnotacaoItem>) => void;
  deleteAnotacao: (id: string) => void;
  togglePinAnotacao: (id: string) => void;
  toggleFavoriteAnotacao: (id: string) => void;
  batchAddAnotacoes: (items: AnotacaoItem[]) => void;

  // Trash Actions
  moveToTrash: (item: Omit<TrashItem, "id" | "deletedAt">) => void;
  restoreFromTrash: (trashId: string) => void;
  permanentlyDeleteFromTrash: (trashId: string) => void;
  emptyTrash: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      sidebarOpen: true,
      searchQuery: "",

      folders: [
        { id: "folder-fc-geral", name: "Geral", color: "#06B6D4", type: "flashcards", createdAt: "Hoje" },
        { id: "folder-q-geral", name: "Geral", color: "#6366F1", type: "questions", createdAt: "Hoje" },
        { id: "folder-mm-geral", name: "Geral", color: "#8B5CF6", type: "mindmaps", createdAt: "Hoje" },
        { id: "caderno-geral", name: "Geral", color: "#2563EB", type: "caderno-erros", createdAt: "Hoje" },
        { id: "anot-macetes", name: "Geral", color: "#F97316", type: "anotacoes", createdAt: "Hoje" },
      ],
      flashcardDecks: [],
      flashcardReviews: [],
      questions: [],
      simulados: [],
      mindmaps: [],
      audioRecordings: [],
      documentTranscriptions: [],
      atelieAnalyses: [],
      tutoriaAnalyses: [],
      imageReadings: [],
      books: [],
      materials: [],
      cadernoFolders: [
        { id: "caderno-geral", name: "Geral", color: "#2563EB", createdAt: "Hoje" },
      ],
      cadernoErrors: [],
      anotacaoFolders: [
        { id: "anot-macetes", name: "Geral", color: "#F97316", createdAt: "Hoje" },
      ],
      anotacoes: [
        {
          id: "anot-demo-1",
          folderId: "anot-macetes",
          title: "Critérios de Centor Modificados (Faringoamigdalite)",
          content: "Utilizado para estimar a probabilidade de infecção por Streptococcus pyogenes (Streptococcus beta-hemolítico do grupo A) e orientar a indicação de teste rápido/antibiograma e antibioticoterapia empírica.\n\n### Pontuação:\n- **Febre referida ou aferida > 38°C**: +1 ponto\n- **Ausência de tosse**: +1 ponto\n- **Adenomegalia cervical anterior dolorosa**: +1 ponto\n- **Exsudato ou edema amigdaliano**: +1 ponto\n- **Idade 3 a 14 anos**: +1 ponto\n- **Idade 15 a 44 anos**: 0 pontos\n- **Idade ≥ 45 anos**: -1 ponto\n\n### Conduta Prática:\n- 0 a 1 ponto: Apenas sintomáticos.\n- 2 a 3 pontos: Fazer teste rápido (TR) ou cultura. Tratar apenas se positivo.\n- 4 ou mais pontos: Tratar com Amoxicilina ou Penicilina Benzatina.",
          highlights: [
            {
              id: "hl-1",
              text: "Tosse AUSENTE pontua +1 no Centor. Presença de tosse afasta etiologia bacteriana clássica e sugere quadro viral!",
              color: "yellow",
              tag: "Pegadinha de Prova",
            },
            {
              id: "hl-2",
              text: "Idade ≥ 45 anos SUBTRAI 1 ponto (-1) na versão modificada de McIsaac.",
              color: "pink",
              tag: "Regra de Ouro",
            },
          ],
          tags: ["Pediatria", "Infectologia", "Ambulatório", "Score"],
          materia: "Infectologia",
          subtema: "Faringite Estreptocócica",
          priority: "alta",
          isPinned: true,
          isFavorite: true,
          colorTheme: "yellow",
          source: {
            type: "question",
            title: "Simulado Nacional R1 - Questão 42",
            snippet: "Escolar de 8 anos com odinofagia, febre 38.5C e exsudato amigdaliano sem tosse.",
          },
          createdAt: "Hoje",
          updatedAt: "Hoje",
        },
      ],
      trashItems: [],

      setTheme: (theme) => {
        set({ theme });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("theme", theme);
          } catch (e) {}
          const root = document.documentElement;
          root.classList.remove("light", "dark");
          if (theme === "system") {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            root.classList.add(prefersDark ? "dark" : "light");
          } else {
            root.classList.add(theme);
          }
        }
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Folders
      addFolder: (newFolder) =>
        set((state) => ({
          folders: [...state.folders, newFolder],
        })),

      updateFolder: (updated) =>
        set((state) => ({
          folders: state.folders.map((f) => (f.id === updated.id ? updated : f)),
        })),

      deleteFolder: (folderId) =>
        set((state) => {
          const folder = state.folders.find((f) => f.id === folderId);
          if (folder) {
            get().moveToTrash({
              originalId: folder.id,
              name: folder.name,
              type: "folder",
              data: folder,
            });
          }
          // Subfolders to delete
          const subfolderIds = state.folders.filter((f) => f.parentId === folderId).map((f) => f.id);
          const allAffectedFolderIds = new Set([folderId, ...subfolderIds]);

          return {
            folders: state.folders.filter((f) => !allAffectedFolderIds.has(f.id)),
            // Reassign decks and questions from deleted folder to folder-geral
            flashcardDecks: state.flashcardDecks.map((d) =>
              d.folderId && allAffectedFolderIds.has(d.folderId)
                ? { ...d, folderId: "folder-geral" }
                : d
            ),
            questions: state.questions.map((q) =>
              q.folderId && allAffectedFolderIds.has(q.folderId)
                ? { ...q, folderId: "folder-geral" }
                : q
            ),
            cadernoErrors: state.cadernoErrors.map((c) =>
              c.folderId && allAffectedFolderIds.has(c.folderId)
                ? { ...c, folderId: undefined }
                : c
            ),
          };
        }),

      getOrCreateFolder: (name, type = "flashcards") => {
        const targetType = type === "both" ? "flashcards" : type;
        const trimmed = (name || "").trim().replace(/^\[.*?\]\s*/, "");
        if (!trimmed) {
          const defaultFolderId =
            targetType === "questions"
              ? "folder-q-geral"
              : targetType === "mindmaps"
              ? "folder-mm-geral"
              : targetType === "anotacoes"
              ? "anot-macetes"
              : targetType === "caderno-erros"
              ? "caderno-geral"
              : "folder-fc-geral";
          const existingGeral = get().folders.find((f) => f.id === defaultFolderId && f.type === targetType);
          if (existingGeral) return existingGeral;
          const defaultFolder: Folder = {
            id: defaultFolderId,
            name: "Geral",
            color:
              targetType === "questions"
                ? "#6366F1"
                : targetType === "mindmaps"
                ? "#8B5CF6"
                : targetType === "anotacoes"
                ? "#F59E0B"
                : targetType === "caderno-erros"
                ? "#EF4444"
                : "#06B6D4",
            type: targetType,
            createdAt: "Hoje",
          };
          set((state) => ({ folders: [...state.folders, defaultFolder] }));
          return defaultFolder;
        }

        const existing = get().folders.find(
          (f) => f.name.trim().toLowerCase() === trimmed.toLowerCase() && f.type === targetType
        );

        if (existing) {
          return existing;
        }

        const FOLDER_COLORS = [
          "#8B5CF6", // Roxo
          "#2563EB", // Azul
          "#059669", // Esmeralda
          "#D97706", // Âmbar
          "#DC2626", // Rose
          "#0891B2", // Ciano
          "#DB2777", // Rosa
          "#4F46E5", // Índigo
        ];
        const color =
          FOLDER_COLORS[
            Math.abs(trimmed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
              FOLDER_COLORS.length
          ];

        const newFolder: Folder = {
          id: `folder_${targetType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: trimmed,
          color,
          type: targetType,
          createdAt: "Hoje",
        };

        set((state) => ({
          folders: [...state.folders, newFolder],
        }));

        return newFolder;
      },

      // Flashcards
      addDeck: (newDeck) =>
        set((state) => {
          let folderId = newDeck.folderId;
          let folders = state.folders;

          const rawSubject = (newDeck.subject || newDeck.name || "")
            .replace(/\s*\(.*?\)\s*/g, "")
            .trim();

          if (
            (!folderId || folderId === "folder-geral" || folderId === "folder-fc-geral") &&
            rawSubject &&
            rawSubject.toLowerCase() !== "geral"
          ) {
            const existing = folders.find(
              (f) => f.name.trim().toLowerCase() === rawSubject.toLowerCase() && f.type === "flashcards"
            );
            if (existing) {
              folderId = existing.id;
            } else {
              const FOLDER_COLORS = [
                "#8B5CF6",
                "#2563EB",
                "#059669",
                "#D97706",
                "#DC2626",
                "#0891B2",
                "#DB2777",
                "#4F46E5",
              ];
              const color =
                FOLDER_COLORS[
                  Math.abs(rawSubject.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
                    FOLDER_COLORS.length
                ];
              const newFolder: Folder = {
                id: `folder_fc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: rawSubject,
                color,
                type: "flashcards",
                createdAt: "Hoje",
              };
              folders = [...folders, newFolder];
              folderId = newFolder.id;
            }
          }

          const sanitizedCards = (newDeck.cards || []).map((c) => ({
            ...c,
            front: cleanFlashcardText(c.front),
            back: cleanFlashcardText(c.back),
          }));

          return {
            folders,
            flashcardDecks: [
              {
                ...newDeck,
                folderId: folderId || "folder-fc-geral",
                cards: sanitizedCards,
                cardCount: sanitizedCards.length,
              },
              ...state.flashcardDecks.filter((d) => d.id !== newDeck.id),
            ],
          };
        }),

      updateDeck: (updated) =>
        set((state) => ({
          flashcardDecks: state.flashcardDecks.map((d) => (d.id === updated.id ? updated : d)),
        })),

      deleteDeck: (deckId) => {
        const deck = get().flashcardDecks.find((d) => d.id === deckId);
        if (deck) {
          get().moveToTrash({
            originalId: deck.id,
            name: deck.name,
            type: "flashcard",
            data: deck,
          });
        }
        set((state) => ({
          flashcardDecks: state.flashcardDecks.filter((d) => d.id !== deckId),
        }));
      },

      deleteDecks: (deckIds) => {
        const idSet = new Set(deckIds);
        const toDelete = get().flashcardDecks.filter((d) => idSet.has(d.id));
        toDelete.forEach((deck) => {
          get().moveToTrash({
            originalId: deck.id,
            name: deck.name,
            type: "flashcard",
            data: deck,
          });
        });
        set((state) => ({
          flashcardDecks: state.flashcardDecks.filter((d) => !idSet.has(d.id)),
        }));
      },

      addCardToDeck: (deckNameOrId, card, folderId) =>
        set((state) => {
          const sanitizedCard: Flashcard = {
            ...card,
            front: cleanFlashcardText(card.front),
            back: cleanFlashcardText(card.back),
          };

          const existing = state.flashcardDecks.find(
            (d) => d.id === deckNameOrId || d.name.toLowerCase() === deckNameOrId.toLowerCase()
          );

          if (existing) {
            return {
              flashcardDecks: state.flashcardDecks.map((d) =>
                d.id === existing.id
                  ? {
                      ...d,
                      folderId: d.folderId || folderId || "folder-geral",
                      cards: [sanitizedCard, ...d.cards],
                      cardCount: (d.cardCount || 0) + 1,
                    }
                  : d
              ),
            };
          }

          // Create new deck if not found
          const newDeck: Deck = {
            id: Date.now().toString(),
            name: deckNameOrId,
            cardCount: 1,
            subject: "Geral",
            folderId: folderId || "folder-geral",
            lastStudied: "Hoje",
            cards: [sanitizedCard],
          };

          return {
            flashcardDecks: [newDeck, ...state.flashcardDecks],
          };
        }),

      addCardsToDeck: (deckId, newCards) =>
        set((state) => {
          const sanitizedCards = (newCards || []).map((c) => ({
            ...c,
            front: cleanFlashcardText(c.front),
            back: cleanFlashcardText(c.back),
          }));

          return {
            flashcardDecks: state.flashcardDecks.map((d) =>
              d.id === deckId
                ? {
                    ...d,
                    cards: [...(d.cards || []), ...sanitizedCards],
                    cardCount: (d.cards?.length || 0) + sanitizedCards.length,
                  }
                : d
            ),
          };
        }),

      updateFlashcardInDeck: (deckId, cardIndex, updatedCard) =>
        set((state) => ({
          flashcardDecks: state.flashcardDecks.map((d) => {
            if (d.id !== deckId) return d;
            const newCards = [...(d.cards || [])];
            if (cardIndex >= 0 && cardIndex < newCards.length) {
              newCards[cardIndex] = {
                ...newCards[cardIndex],
                ...updatedCard,
                ...(updatedCard.front !== undefined ? { front: cleanFlashcardText(updatedCard.front) } : {}),
                ...(updatedCard.back !== undefined ? { back: cleanFlashcardText(updatedCard.back) } : {}),
              };
            }
            return {
              ...d,
              cards: newCards,
            };
          }),
        })),

      deleteCardFromDeck: (deckId, cardIndex) =>
        set((state) => ({
          flashcardDecks: state.flashcardDecks.map((d) => {
            if (d.id !== deckId) return d;
            const newCards = (d.cards || []).filter((_, idx) => idx !== cardIndex);
            return {
              ...d,
              cards: newCards,
              cardCount: newCards.length,
            };
          }),
        })),

      moveDeckToFolder: (deckId, folderId) =>
        set((state) => ({
          flashcardDecks: state.flashcardDecks.map((d) =>
            d.id === deckId ? { ...d, folderId } : d
          ),
        })),

      recordFlashcardReview: (review) =>
        set((state) => ({
          flashcardReviews: [
            ...state.flashcardReviews,
            {
              ...review,
              id: Date.now().toString() + "-" + Math.random().toString(36).slice(2, 7),
              reviewedAt: new Date().toISOString(),
            },
          ],
          flashcardDecks: state.flashcardDecks.map((d) =>
            d.id === review.deckId ? { ...d, lastStudied: "Hoje" } : d
          ),
        })),

      // Questions
      addQuestion: (newQ) =>
        set((state) => {
          let folders = state.folders;
          let folderId = newQ.folderId;
          const rawSubject = (newQ.subject || "").trim();

          if (
            (!folderId || folderId === "folder-geral" || folderId === "folder-q-geral") &&
            rawSubject &&
            rawSubject.toLowerCase() !== "geral"
          ) {
            const existing = folders.find(
              (f) => f.name.trim().toLowerCase() === rawSubject.toLowerCase() && f.type === "questions"
            );
            if (existing) {
              folderId = existing.id;
            } else {
              const FOLDER_COLORS = [
                "#8B5CF6",
                "#2563EB",
                "#059669",
                "#D97706",
                "#DC2626",
                "#0891B2",
                "#DB2777",
                "#4F46E5",
              ];
              const color =
                FOLDER_COLORS[
                  Math.abs(rawSubject.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
                    FOLDER_COLORS.length
                ];
              const newFolder: Folder = {
                id: `folder_q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: rawSubject,
                color,
                type: "questions",
                createdAt: "Hoje",
              };
              folders = [...folders, newFolder];
              folderId = newFolder.id;
            }
          }

          const item = { ...newQ, folderId: folderId || "folder-q-geral" };
          return {
            folders,
            questions: [item, ...state.questions.filter((q) => q.id !== item.id)],
          };
        }),

      addQuestions: (newQuestions) =>
        set((state) => {
          let folders = state.folders;
          const processed = newQuestions.map((q) => {
            let folderId = q.folderId;
            const rawSubject = (q.subject || "").trim();

            if (
              (!folderId || folderId === "folder-geral" || folderId === "folder-q-geral") &&
              rawSubject &&
              rawSubject.toLowerCase() !== "geral"
            ) {
              const existing = folders.find(
                (f) => f.name.trim().toLowerCase() === rawSubject.toLowerCase() && f.type === "questions"
              );
              if (existing) {
                folderId = existing.id;
              } else {
                const FOLDER_COLORS = [
                  "#8B5CF6",
                  "#2563EB",
                  "#059669",
                  "#D97706",
                  "#DC2626",
                  "#0891B2",
                  "#DB2777",
                  "#4F46E5",
                ];
                const color =
                  FOLDER_COLORS[
                    Math.abs(rawSubject.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
                      FOLDER_COLORS.length
                  ];
                const newFolder: Folder = {
                  id: `folder_q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  name: rawSubject,
                  color,
                  type: "questions",
                  createdAt: "Hoje",
                };
                folders = [...folders, newFolder];
                folderId = newFolder.id;
              }
            }

            return {
              ...q,
              folderId: folderId || "folder-q-geral",
            };
          });

          const ids = new Set(processed.map((q) => q.id));
          return {
            folders,
            questions: [...processed, ...state.questions.filter((q) => !ids.has(q.id))],
          };
        }),

      updateQuestion: (updatedQ) =>
        set((state) => ({
          questions: state.questions.map((q) => (q.id === updatedQ.id ? updatedQ : q)),
        })),

      deleteQuestion: (questionId) => {
        const q = get().questions.find((item) => item.id === questionId);
        if (q) {
          get().moveToTrash({
            originalId: q.id,
            name: q.text?.slice(0, 40) || "Questão",
            type: "question",
            data: q,
          });
        }
        set((state) => ({
          questions: state.questions.filter((item) => item.id !== questionId),
        }));
      },

      deleteQuestions: (questionIds) => {
        const idSet = new Set(questionIds);
        const toDelete = get().questions.filter((q) => idSet.has(q.id));
        toDelete.forEach((q) => {
          get().moveToTrash({
            originalId: q.id,
            name: q.text?.slice(0, 40) || "Questão",
            type: "question",
            data: q,
          });
        });
        set((state) => ({
          questions: state.questions.filter((item) => !idSet.has(item.id)),
        }));
      },

      clearQuestionsByFolder: (folderId) => {
        let toDelete: Question[] = [];
        if (folderId === null) {
          toDelete = get().questions;
        } else if (folderId === "unassigned") {
          const relevantFolders = get().folders.filter((f) => f.type === "questions");
          const validIds = new Set(relevantFolders.map((f) => f.id));
          toDelete = get().questions.filter((q) => !q.folderId || !validIds.has(q.folderId));
        } else {
          const getDescendants = (id: string): string[] => {
            const children = get().folders.filter((f) => f.parentId === id).map((f) => f.id);
            return [id, ...children.flatMap(getDescendants)];
          };
          const targetIds = new Set(getDescendants(folderId));
          toDelete = get().questions.filter((q) => targetIds.has(q.folderId || "folder-q-geral"));
        }

        toDelete.forEach((q) => {
          get().moveToTrash({
            originalId: q.id,
            name: q.text?.slice(0, 40) || "Questão",
            type: "question",
            data: q,
          });
        });

        const deleteSet = new Set(toDelete.map((q) => q.id));
        set((state) => ({
          questions: state.questions.filter((item) => !deleteSet.has(item.id)),
        }));
      },

      moveQuestionToFolder: (questionId, folderId) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId ? { ...q, folderId } : q
          ),
        })),

      recordQuestionAnswer: (questionId, isCorrect, selectedOption) =>
        set((state) => ({
          questions: state.questions.map((q) => {
            if (q.id === questionId) {
              const timesAnswered = (q.timesAnswered || 0) + 1;
              const timesCorrect = (q.timesCorrect || 0) + (isCorrect ? 1 : 0);
              const timesIncorrect = (q.timesIncorrect || 0) + (isCorrect ? 0 : 1);
              return {
                ...q,
                status: isCorrect ? "correct" : "incorrect",
                userAnswer: selectedOption !== undefined ? selectedOption : q.userAnswer,
                timesAnswered,
                timesCorrect,
                timesIncorrect,
                lastAnsweredAt: new Date().toISOString(),
                isFlaggedForReview: !isCorrect ? true : q.isFlaggedForReview,
              };
            }
            return q;
          }),
        })),

      toggleQuestionReview: (questionId) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId ? { ...q, isFlaggedForReview: !q.isFlaggedForReview } : q
          ),
        })),

      resetQuestionStats: (questionId) =>
        set((state) => ({
          questions: state.questions.map((q) => {
            if (!questionId || q.id === questionId) {
              return {
                ...q,
                status: "unanswered",
                userAnswer: undefined,
                timesAnswered: 0,
                timesCorrect: 0,
                timesIncorrect: 0,
                lastAnsweredAt: undefined,
                isFlaggedForReview: false,
              };
            }
            return q;
          }),
        })),

      // Simulados
      addSimulado: (newSimulado) =>
        set((state) => ({
          simulados: [newSimulado, ...state.simulados.filter((s) => s.id !== newSimulado.id)],
        })),

      updateSimulado: (updated) =>
        set((state) => ({
          simulados: state.simulados.map((s) => (s.id === updated.id ? updated : s)),
        })),

      deleteSimulado: (simuladoId) => {
        const s = get().simulados.find((item) => item.id === simuladoId);
        if (s) {
          get().moveToTrash({
            originalId: s.id,
            name: s.title || "Simulado",
            type: "simulado",
            data: s,
          });
        }
        set((state) => ({
          simulados: state.simulados.filter((item) => item.id !== simuladoId),
        }));
      },

      // MindMaps
      addMindMap: (newMap) =>
        set((state) => ({
          mindmaps: [newMap, ...state.mindmaps.filter((m) => m.id !== newMap.id)],
        })),

      updateMindMap: (updated) =>
        set((state) => ({
          mindmaps: state.mindmaps.map((m) => (m.id === updated.id ? updated : m)),
        })),

      deleteMindMap: (mapId) => {
        const m = get().mindmaps.find((item) => item.id === mapId);
        if (m) {
          get().moveToTrash({
            originalId: m.id,
            name: m.name,
            type: "mindmap",
            data: m,
          });
        }
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem(`mindmap_${mapId}`);
          }
        } catch (e) {}
        set((state) => ({
          mindmaps: state.mindmaps.filter((item) => item.id !== mapId),
        }));
      },

      moveMindMapToFolder: (mapId, folderId) => {
        try {
          const item = localStorage.getItem(`mindmap_${mapId}`);
          if (item) {
            const parsed = JSON.parse(item);
            parsed.folderId = folderId;
            localStorage.setItem(`mindmap_${mapId}`, JSON.stringify(parsed));
          }
        } catch (e) {}
        set((state) => ({
          mindmaps: state.mindmaps.map((m) =>
            m.id === mapId ? { ...m, folderId } : m
          ),
        }));
      },

      // Audio
      addAudioRecording: (recording) =>
        set((state) => ({
          audioRecordings: [recording, ...state.audioRecordings.filter((a) => a.id !== recording.id)],
        })),

      updateAudioRecording: (recordingId, updates) =>
        set((state) => ({
          audioRecordings: state.audioRecordings.map((a) =>
            a.id === recordingId ? { ...a, ...updates } : a
          ),
        })),

      deleteAudioRecording: (recordingId) => {
        const a = get().audioRecordings.find((item) => item.id === recordingId);
        if (a) {
          get().moveToTrash({
            originalId: a.id,
            name: a.title,
            type: "audio",
            data: a,
          });
        }
        set((state) => ({
          audioRecordings: state.audioRecordings.filter((item) => item.id !== recordingId),
        }));
      },

      // Document Transcriptions
      addDocumentTranscription: (transcription) =>
        set((state) => ({
          documentTranscriptions: [transcription, ...state.documentTranscriptions.filter((t) => t.id !== transcription.id)],
        })),

      updateDocumentTranscription: (transcriptionId, updates) =>
        set((state) => ({
          documentTranscriptions: state.documentTranscriptions.map((t) =>
            t.id === transcriptionId ? { ...t, ...updates } : t
          ),
        })),

      deleteDocumentTranscription: (transcriptionId) => {
        const t = get().documentTranscriptions.find((item) => item.id === transcriptionId);
        if (t) {
          get().moveToTrash({
            originalId: t.id,
            name: t.title,
            type: "transcription" as any,
            data: t,
          });
        }
        set((state) => ({
          documentTranscriptions: state.documentTranscriptions.filter((item) => item.id !== transcriptionId),
        }));
      },

      // Ateliê (SP) Analyses
      addAtelieAnalysis: (analysis) =>
        set((state) => ({
          atelieAnalyses: [analysis, ...state.atelieAnalyses.filter((a) => a.id !== analysis.id)],
        })),

      updateAtelieAnalysis: (analysisId, updates) =>
        set((state) => ({
          atelieAnalyses: state.atelieAnalyses.map((a) => (a.id === analysisId ? { ...a, ...updates } : a)),
        })),

      deleteAtelieAnalysis: (analysisId) => {
        const a = get().atelieAnalyses.find((item) => item.id === analysisId);
        if (a) {
          get().moveToTrash({
            originalId: a.id,
            name: a.title,
            type: "atelie",
            data: a,
          });
        }
        set((state) => ({
          atelieAnalyses: state.atelieAnalyses.filter((item) => item.id !== analysisId),
        }));
      },

      // Tutoria Analyses
      addTutoriaAnalysis: (analysis) =>
        set((state) => ({
          tutoriaAnalyses: [analysis, ...state.tutoriaAnalyses.filter((a) => a.id !== analysis.id)],
        })),

      updateTutoriaAnalysis: (id, updates) =>
        set((state) => ({
          tutoriaAnalyses: state.tutoriaAnalyses.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteTutoriaAnalysis: (id) => {
        const a = get().tutoriaAnalyses.find((item) => item.id === id);
        if (a) {
          get().moveToTrash({
            originalId: a.id,
            name: a.title,
            type: "tutoria",
            data: a,
          });
        }
        set((state) => ({
          tutoriaAnalyses: state.tutoriaAnalyses.filter((item) => item.id !== id),
        }));
      },

      // Image Readings
      addImageReading: (item) =>
        set((state) => {
          const updated = [item, ...(state.imageReadings || []).filter((r) => r.id !== item.id)];
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("medsetup_image_readings", JSON.stringify(updated));
            }
          } catch {}
          return { imageReadings: updated };
        }),

      updateImageReading: (id, updates) =>
        set((state) => {
          const updated = (state.imageReadings || []).map((r) =>
            r.id === id ? { ...r, ...updates } : r
          );
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("medsetup_image_readings", JSON.stringify(updated));
            }
          } catch {}
          return { imageReadings: updated };
        }),

      deleteImageReading: (id) => {
        const item = (get().imageReadings || []).find((r) => r.id === id);
        if (item) {
          get().moveToTrash({
            originalId: item.id,
            name: item.name || "Leitura de Imagem",
            type: "image_reading",
            data: item,
          });
        }
        set((state) => {
          const updated = (state.imageReadings || []).filter((r) => r.id !== id);
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("medsetup_image_readings", JSON.stringify(updated));
            }
          } catch {}
          return { imageReadings: updated };
        });
      },

      // Books
      addBook: (book) =>
        set((state) => ({
          books: [book, ...state.books.filter((b) => b.id !== book.id)],
        })),

      updateBook: (bookId, updates) =>
        set((state) => ({
          books: state.books.map((b) => (b.id === bookId ? { ...b, ...updates } : b)),
        })),

      deleteBook: (bookId) => {
        const b = get().books.find((item) => item.id === bookId);
        if (b) {
          get().moveToTrash({
            originalId: b.id,
            name: b.title,
            type: "book",
            data: b,
          });
        }
        set((state) => ({
          books: state.books.filter((item) => item.id !== bookId),
        }));
      },

      // Materials
      addMaterial: (mat) =>
        set((state) => ({
          materials: [mat, ...state.materials.filter((m) => m.id !== mat.id)],
        })),

      deleteMaterial: (materialId) => {
        const mat = get().materials.find((item) => item.id === materialId);
        if (mat) {
          get().moveToTrash({
            originalId: mat.id,
            name: mat.name,
            type: "material",
            data: mat,
          });
        }
        set((state) => ({
          materials: state.materials.filter((item) => item.id !== materialId),
        }));
      },

      // Caderno de Erros Actions
      addCadernoFolder: (folder) =>
        set((state) => ({
          cadernoFolders: [...state.cadernoFolders.filter((f) => f.id !== folder.id), folder],
        })),

      updateCadernoFolder: (id, updates) =>
        set((state) => ({
          cadernoFolders: state.cadernoFolders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),

      deleteCadernoFolder: (id) =>
        set((state) => ({
          cadernoFolders: state.cadernoFolders.filter((f) => f.id !== id),
          // Reassign items in this folder to undefined
          cadernoErrors: state.cadernoErrors.map((err) => (err.folderId === id ? { ...err, folderId: undefined } : err)),
        })),

      addCadernoError: (errorItem) =>
        set((state) => ({
          cadernoErrors: [errorItem, ...state.cadernoErrors.filter((e) => e.id !== errorItem.id)],
        })),

      updateCadernoError: (id, updates) =>
        set((state) => ({
          cadernoErrors: state.cadernoErrors.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      deleteCadernoError: (id) => {
        const err = get().cadernoErrors.find((item) => item.id === id);
        if (err) {
          get().moveToTrash({
            originalId: err.id,
            name: `${err.especialidade || "Erro"}: ${err.pontoCego.slice(0, 40)}`,
            type: "caderno_error",
            data: err,
          });
        }
        set((state) => ({
          cadernoErrors: state.cadernoErrors.filter((item) => item.id !== id),
        }));
      },

      batchAddCadernoErrors: (items) =>
        set((state) => {
          const newIds = new Set(items.map((i) => i.id));
          return {
            cadernoErrors: [...items, ...state.cadernoErrors.filter((e) => !newIds.has(e.id))],
          };
        }),

      moveCadernoErrorToFolder: (errorId, folderId) =>
        set((state) => ({
          cadernoErrors: state.cadernoErrors.map((c) =>
            c.id === errorId ? { ...c, folderId } : c
          ),
        })),

      // Anotações Actions
      addAnotacaoFolder: (folder) =>
        set((state) => ({
          anotacaoFolders: [...state.anotacaoFolders, folder],
        })),

      updateAnotacaoFolder: (id, updates) =>
        set((state) => ({
          anotacaoFolders: state.anotacaoFolders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),

      deleteAnotacaoFolder: (id) =>
        set((state) => ({
          anotacaoFolders: state.anotacaoFolders.filter((f) => f.id !== id),
          anotacoes: state.anotacoes.map((a) => (a.folderId === id ? { ...a, folderId: undefined } : a)),
        })),

      addAnotacao: (anotacao) => {
        const now = new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        const newItem: AnotacaoItem = {
          ...anotacao,
          id: anotacao.id || Date.now().toString() + "-" + Math.random().toString(36).slice(2, 6),
          createdAt: anotacao.createdAt || now,
          updatedAt: anotacao.updatedAt || now,
          highlights: anotacao.highlights || [],
          tags: anotacao.tags || [],
          priority: anotacao.priority || "media",
        };
        set((state) => ({
          anotacoes: [newItem, ...state.anotacoes],
        }));
        return newItem;
      },

      updateAnotacao: (id, updates) =>
        set((state) => ({
          anotacoes: state.anotacoes.map((a) =>
            a.id === id
              ? {
                  ...a,
                  ...updates,
                  updatedAt: new Date().toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }),
                }
              : a
          ),
        })),

      deleteAnotacao: (id) => {
        const item = get().anotacoes.find((a) => a.id === id);
        if (item) {
          get().moveToTrash({
            originalId: item.id,
            name: `Anotação: ${item.title.slice(0, 40)}`,
            type: "anotacao",
            data: item,
          });
        }
        set((state) => ({
          anotacoes: state.anotacoes.filter((a) => a.id !== id),
        }));
      },

      togglePinAnotacao: (id) =>
        set((state) => ({
          anotacoes: state.anotacoes.map((a) =>
            a.id === id ? { ...a, isPinned: !a.isPinned } : a
          ),
        })),

      toggleFavoriteAnotacao: (id) =>
        set((state) => ({
          anotacoes: state.anotacoes.map((a) =>
            a.id === id ? { ...a, isFavorite: !a.isFavorite } : a
          ),
        })),

      batchAddAnotacoes: (items) =>
        set((state) => {
          const newIds = new Set(items.map((i) => i.id));
          return {
            anotacoes: [...items, ...state.anotacoes.filter((a) => !newIds.has(a.id))],
          };
        }),

      // Trash
      moveToTrash: (item) => {
        const trashItem: TrashItem = {
          ...item,
          id: Date.now().toString(),
          deletedAt: new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        };
        set((state) => ({
          trashItems: [trashItem, ...state.trashItems],
        }));
      },

      restoreFromTrash: (trashId) => {
        const item = get().trashItems.find((t) => t.id === trashId);
        if (!item) return;

        if (item.type === "flashcard" && item.data) {
          get().addDeck(item.data);
        } else if (item.type === "question" && item.data) {
          get().addQuestion(item.data);
        } else if (item.type === "mindmap" && item.data) {
          get().addMindMap(item.data);
        } else if (item.type === "audio" && item.data) {
          get().addAudioRecording(item.data);
        } else if (item.type === "material" && item.data) {
          get().addMaterial(item.data);
        } else if (item.type === "folder" && item.data) {
          get().addFolder(item.data);
        } else if (item.type === "simulado" && item.data) {
          get().addSimulado(item.data);
        } else if ((item.type as string) === "transcription" && item.data) {
          get().addDocumentTranscription(item.data);
        } else if (item.type === "atelie" && item.data) {
          get().addAtelieAnalysis(item.data);
        } else if (item.type === "tutoria" && item.data) {
          get().addTutoriaAnalysis(item.data);
        } else if (item.type === "book" && item.data) {
          get().addBook(item.data);
        } else if (item.type === "caderno_error" && item.data) {
          get().addCadernoError(item.data);
        } else if (item.type === "anotacao" && item.data) {
          get().addAnotacao(item.data);
        } else if (item.type === "image_reading" && item.data) {
          get().addImageReading(item.data);
        }

        set((state) => ({
          trashItems: state.trashItems.filter((t) => t.id !== trashId),
        }));
      },

      permanentlyDeleteFromTrash: (trashId) =>
        set((state) => ({
          trashItems: state.trashItems.filter((t) => t.id !== trashId),
        })),

      emptyTrash: () => set({ trashItems: [] }),
    }),
    {
      name: "medsetup_app_storage",
      storage: {
        getItem: (name: string) => {
          if (typeof window === "undefined") return null;
          try {
            const raw = localStorage.getItem(name) || localStorage.getItem("studyflow_app_storage");
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && parsed.state) {
              // Recupera do backup dedicado de leituras de imagem caso o array esteja vazio
              try {
                const imgBackup = localStorage.getItem("medsetup_image_readings");
                if (imgBackup) {
                  const backupList = JSON.parse(imgBackup);
                  if (Array.isArray(backupList) && backupList.length > 0) {
                    if (!parsed.state.imageReadings || parsed.state.imageReadings.length === 0) {
                      parsed.state.imageReadings = backupList;
                    }
                  }
                }
              } catch {}
            }
            return parsed;
          } catch {
            return null;
          }
        },
        setItem: (name: string, value: any) => {
          if (typeof window === "undefined") return;
          try {
            // Salva backup dedicado síncrono das leituras de imagens (protegido contra perda)
            if (value && value.state && Array.isArray(value.state.imageReadings)) {
              try {
                localStorage.setItem("medsetup_image_readings", JSON.stringify(value.state.imageReadings));
              } catch {}
            }
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            console.warn("Storage write error or quota exceeded:", e);
            // Em caso de cota de armazenamento quase cheia, purga a lixeira e caches leves para garantir salvamento
            try {
              if (value && value.state) {
                const trimmed = {
                  ...value,
                  state: {
                    ...value.state,
                    trashItems: [],
                  },
                };
                localStorage.setItem(name, JSON.stringify(trimmed));
              }
            } catch (retryErr) {
              console.error("Critical storage fallback failure:", retryErr);
            }
          }
        },
        removeItem: (name: string) => {
          if (typeof window === "undefined") return;
          try {
            localStorage.removeItem(name);
          } catch {}
        },
      },
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        folders: state.folders,
        flashcardDecks: state.flashcardDecks,
        flashcardReviews: state.flashcardReviews,
        questions: state.questions,
        simulados: state.simulados,
        mindmaps: state.mindmaps,
        audioRecordings: state.audioRecordings,
        documentTranscriptions: state.documentTranscriptions,
        atelieAnalyses: state.atelieAnalyses,
        tutoriaAnalyses: state.tutoriaAnalyses,
        books: state.books,
        materials: state.materials,
        cadernoFolders: state.cadernoFolders,
        cadernoErrors: state.cadernoErrors,
        anotacaoFolders: state.anotacaoFolders,
        anotacoes: state.anotacoes,
        imageReadings: (state.imageReadings || []).map((ir) => {
          const cleanResult = ir.result && typeof ir.result === "object" ? { ...ir.result } : ir.result;
          if (cleanResult && cleanResult.imageUrl && typeof cleanResult.imageUrl === "string" && cleanResult.imageUrl.startsWith("data:") && cleanResult.imageUrl.length > 50000) {
            cleanResult.imageUrl = undefined;
          }
          return {
            ...ir,
            // Evita estourar a cota de 5MB do localStorage caso alguma imagem seja data:URL bruta
            imageUrl: ir.imageUrl && ir.imageUrl.startsWith("data:") && ir.imageUrl.length > 50000 ? undefined : ir.imageUrl,
            result: cleanResult,
          };
        }),
        trashItems: state.trashItems,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (!state.imageReadings || state.imageReadings.length === 0) {
          try {
            if (typeof window !== "undefined") {
              const imgBackup = localStorage.getItem("medsetup_image_readings");
              if (imgBackup) {
                const parsed = JSON.parse(imgBackup);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  state.imageReadings = parsed;
                }
              }
            }
          } catch {}
          if (!state.imageReadings) {
            state.imageReadings = [];
          }
        }

        // 1. Particionar pastas legadas com type === 'both' para que cada aba seja independente
        if (state.folders && state.folders.length > 0) {
          const updatedFolders: Folder[] = [];
          for (const f of state.folders) {
            // Anotações
            if (f.id.startsWith("anot-") || (f as any).id?.startsWith("anotacao")) {
              updatedFolders.push({ ...f, type: "anotacoes" });
              continue;
            }

            if (f.type === "both" || !(f as any).type) {
              if (f.id === "folder-geral") {
                // Desmembrar folder-geral em pastas gerais exclusivas por aba
                updatedFolders.push(
                  { id: "folder-fc-geral", name: "Geral", color: "#06B6D4", type: "flashcards", createdAt: f.createdAt || "Hoje" },
                  { id: "folder-q-geral", name: "Geral", color: "#6366F1", type: "questions", createdAt: f.createdAt || "Hoje" },
                  { id: "folder-mm-geral", name: "Geral", color: "#8B5CF6", type: "mindmaps", createdAt: f.createdAt || "Hoje" }
                );

                // Migrar referências de itens antigos que apontavam para folder-geral
                if (state.flashcardDecks) {
                  state.flashcardDecks.forEach((d) => {
                    if (d.folderId === "folder-geral" || !d.folderId) d.folderId = "folder-fc-geral";
                  });
                }
                if (state.questions) {
                  state.questions.forEach((q) => {
                    if (q.folderId === "folder-geral" || !q.folderId) q.folderId = "folder-q-geral";
                  });
                }
                if (state.mindmaps) {
                  state.mindmaps.forEach((m) => {
                    if (m.folderId === "folder-geral" || !m.folderId) m.folderId = "folder-mm-geral";
                  });
                }
              } else {
                // Verificar onde esta pasta era utilizada
                const isFc = state.flashcardDecks?.some((d) => d.folderId === f.id);
                const isQ = state.questions?.some((q) => q.folderId === f.id);
                const isMm = state.mindmaps?.some((m) => m.folderId === f.id);
                const isAnot = state.anotacoes?.some((a) => a.folderId === f.id);

                if (isAnot) {
                  updatedFolders.push({ ...f, type: "anotacoes" });
                } else if (isQ && !isFc && !isMm) {
                  updatedFolders.push({ ...f, type: "questions" });
                } else if (isMm && !isFc && !isQ) {
                  updatedFolders.push({ ...f, type: "mindmaps" });
                } else {
                  // Default para flashcards se era de flashcards ou órfã
                  updatedFolders.push({ ...f, type: "flashcards" });
                }
              }
            } else {
              updatedFolders.push(f);
            }
          }
          state.folders = updatedFolders;
        }

        // 2. Garantir apenas a pasta Geral essencial para cada aba e remover pastas pré-geradas vazias/duplicadas
        if (!state.folders.some((f) => f.id === "folder-fc-geral" && f.type === "flashcards")) {
          state.folders.unshift({ id: "folder-fc-geral", name: "Geral", color: "#06B6D4", type: "flashcards", createdAt: "Hoje" });
        }
        if (!state.folders.some((f) => f.id === "folder-q-geral" && f.type === "questions")) {
          state.folders.unshift({ id: "folder-q-geral", name: "Geral", color: "#6366F1", type: "questions", createdAt: "Hoje" });
        }
        if (!state.folders.some((f) => f.id === "folder-mm-geral" && f.type === "mindmaps")) {
          state.folders.unshift({ id: "folder-mm-geral", name: "Geral", color: "#8B5CF6", type: "mindmaps", createdAt: "Hoje" });
        }
        if (!state.folders.some((f) => f.id === "caderno-geral" && f.type === "caderno-erros")) {
          state.folders.unshift({ id: "caderno-geral", name: "Geral", color: "#2563EB", type: "caderno-erros", createdAt: "Hoje" });
        }
        if (!state.folders.some((f) => f.id === "anot-macetes" && f.type === "anotacoes")) {
          state.folders.unshift({ id: "anot-macetes", name: "Macetes & Regras de Ouro", color: "#F97316", type: "anotacoes", createdAt: "Hoje" });
        }

        // Remover pastas padrão antigas/duplicadas que estão vazias (sem itens e sem subpastas)
        const legacyAutoFolderIds = new Set([
          "folder-fc-farmaco",
          "folder-fc-clinica",
          "folder-q-simulados",
          "folder-q-especialidades",
          "folder-mm-fisiopat",
          "folder-ce-clinica",
          "folder-ce-cirurgia",
          "folder-ce-pediatria",
          "folder-ce-ginecologia",
          "folder-ce-preventiva",
          "caderno-patologia",
          "caderno-clinica",
          "caderno-oncologia",
          "anot-clinica",
          "anot-cirurgia",
          "anot-pediatria",
          "anot-geral",
        ]);

        const usedFolderIds = new Set<string>();
        (state.flashcardDecks || []).forEach((d) => { if (d.folderId) usedFolderIds.add(d.folderId); });
        (state.questions || []).forEach((q) => { if (q.folderId) usedFolderIds.add(q.folderId); });
        (state.mindmaps || []).forEach((m) => { if (m.folderId) usedFolderIds.add(m.folderId); });
        (state.cadernoErrors || []).forEach((e) => { if (e.folderId) usedFolderIds.add(e.folderId); });
        (state.anotacoes || []).forEach((a) => { if (a.folderId) usedFolderIds.add(a.folderId); });
        (state.folders || []).forEach((f) => { if (f.parentId) usedFolderIds.add(f.parentId); });

        state.folders = state.folders.filter(
          (f) => !legacyAutoFolderIds.has(f.id) || usedFolderIds.has(f.id)
        );
        // Deduplicar pastas com mesmo nome e mesmo tipo/parentId quando duplicadas sem itens
        const seenFolderKeys = new Set<string>();
        state.folders = state.folders.filter((f) => {
          const key = `${f.type}::${f.parentId || ""}::${(f.name || "").trim().toLowerCase()}`;
          if (!seenFolderKeys.has(key)) {
            seenFolderKeys.add(key);
            return true;
          }
          return usedFolderIds.has(f.id);
        });
        if (state.cadernoFolders) {
          state.cadernoFolders = state.cadernoFolders.filter(
            (cf) => !legacyAutoFolderIds.has(cf.id) || usedFolderIds.has(cf.id)
          );
        }

        const validCeFolderIds = new Set(state.folders.filter((f) => f.type === "caderno-erros").map((f) => f.id));
        if (state.cadernoErrors && state.cadernoErrors.length > 0) {
          state.cadernoErrors.forEach((e) => {
            if (!e.folderId || e.folderId === "folder-geral" || !validCeFolderIds.has(e.folderId)) {
              e.folderId = "caderno-geral";
            }
          });
        }

        // Migrar itens com folderId inválido ou antigo para a pasta Geral da aba correspondente
        const validQFolderIds = new Set(state.folders.filter((f) => f.type === "questions").map((f) => f.id));
        if (state.questions && state.questions.length > 0) {
          state.questions.forEach((q) => {
            if (!q.folderId || q.folderId === "folder-geral" || !validQFolderIds.has(q.folderId)) {
              q.folderId = "folder-q-geral";
            }
          });
        }
        const validFcFolderIds = new Set(state.folders.filter((f) => f.type === "flashcards").map((f) => f.id));
        if (state.flashcardDecks && state.flashcardDecks.length > 0) {
          state.flashcardDecks.forEach((d) => {
            if (!d.folderId || d.folderId === "folder-geral" || !validFcFolderIds.has(d.folderId)) {
              d.folderId = "folder-fc-geral";
            }
          });
        }
        const validMmFolderIds = new Set(state.folders.filter((f) => f.type === "mindmaps").map((f) => f.id));
        if (state.mindmaps && state.mindmaps.length > 0) {
          state.mindmaps.forEach((m) => {
            if (!m.folderId || m.folderId === "folder-geral" || !validMmFolderIds.has(m.folderId)) {
              m.folderId = "folder-mm-geral";
            }
          });
        }

        // Sanitize all flashcard decks on load to strip any legacy HTML tags, broken spans, or raw LaTeX
        if (state.flashcardDecks && state.flashcardDecks.length > 0) {
          state.flashcardDecks.forEach((d) => {
            if (d.cards && Array.isArray(d.cards)) {
              d.cards.forEach((c) => {
                if (c.front) c.front = cleanFlashcardText(c.front);
                if (c.back) c.back = cleanFlashcardText(c.back);
              });
            }
          });
        }

        if (state.documentTranscriptions && state.documentTranscriptions.length > 0) {
          for (const item of state.documentTranscriptions) {
            if (item.summary && item.summary.length > (item.content?.length || 0)) {
              item.content = item.summary;
            }
          }
        }
      },
    }
  )
);
