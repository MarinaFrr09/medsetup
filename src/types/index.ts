export type ThemeMode = "light" | "dark" | "system";

export type QuestionType = "multiple_choice" | "true_false" | "essay";
export type Difficulty = "easy" | "medium" | "hard";
export type MindMapLayout = "free" | "hierarchical" | "tree" | "radial" | "circular" | "grid";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface AIGenerateRequest {
  prompt: string;
  count?: number;
  difficulty?: Difficulty;
  subjectId?: string;
  type?: QuestionType;
}

export interface MindMapNode {
  id: string;
  type: "topic" | "subtopic" | "note" | "image" | "link";
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    color?: string;
    fontSize?: number;
    shape?: "rounded" | "rectangle" | "circle" | "diamond";
    imageUrl?: string;
    url?: string;
  };
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  type?: "default" | "smoothstep" | "bezier" | "straight";
  label?: string;
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
  animated?: boolean;
}

export interface TranscriptionResult {
  transcript: string;
  summary: string;
  keyPoints: string[];
  topics: {
    title: string;
    content: string;
  }[];
}

export interface ImageReadingResult {
  summary: string;
  keyPoints: string[];
  mindMapNodes?: MindMapNode[];
  mindMapEdges?: MindMapEdge[];
}

export interface DashboardStats {
  totalQuestions: number;
  totalFlashcards: number;
  totalMindMaps: number;
  totalRecordings: number;
  questionsAnswered: number;
  correctRate: number;
}
